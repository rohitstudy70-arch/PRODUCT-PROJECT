import DutySession from './dutySession.model.js';
import StaffLocation from './staffLocation.model.js';
import Staff from '../staff/staff.model.js';
import Notification from '../notification/notification.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

// Haversine formula to calculate distance between two coordinates in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/v1/tracking/ping - Receive location telemetry from staff device
export const postLocationTelemetry = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy, speed, heading, batteryLevel, isInternetConnected, isGpsEnabled } = req.body;

  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'Latitude and longitude coordinates are required');
  }

  // Find active duty session for staff
  let session = await DutySession.findOne({
    staffId: req.user._id,
    status: 'ON_DUTY'
  });

  if (!session) {
    // If no session exists but user is ON_DUTY, create fallback session
    const staff = await Staff.findById(req.user._id);
    if (staff && staff.dutyStatus === 'ON_DUTY') {
      session = await DutySession.create({
        organizationId: req.user.organizationId,
        branchId: req.user.branchId || staff.branchId,
        staffId: req.user._id,
        status: 'ON_DUTY',
        startTime: new Date()
      });
      staff.activeDutySessionId = session._id;
      await staff.save();
    } else {
      return res.status(200).json(new ApiResponse(200, 'Tracking inactive - Staff not on duty', { trackingActive: false }));
    }
  }

  // Get last recorded location point to calculate incremental distance
  const lastLocation = await StaffLocation.findOne({ dutySessionId: session._id }).sort({ timestamp: -1 });

  let distKm = 0;
  if (lastLocation) {
    distKm = calculateDistanceKm(lastLocation.latitude, lastLocation.longitude, latitude, longitude);
  }

  // Save new telemetry point
  const locationPoint = await StaffLocation.create({
    dutySessionId: session._id,
    staffId: req.user._id,
    branchId: session.branchId,
    organizationId: req.user.organizationId,
    latitude,
    longitude,
    accuracy: accuracy || 10,
    speed: speed || 0,
    heading: heading || 0,
    batteryLevel: batteryLevel !== undefined ? batteryLevel : 100,
    isInternetConnected: isInternetConnected !== undefined ? isInternetConnected : true,
    isGpsEnabled: isGpsEnabled !== undefined ? isGpsEnabled : true,
    timestamp: new Date()
  });

  // Accumulate distance in duty session
  if (distKm > 0.01) { // ignore jitter < 10 meters
    session.totalDistanceKm = (session.totalDistanceKm || 0) + distKm;
    await session.save();
  }

  // Low battery alert check
  if (batteryLevel !== undefined && batteryLevel < 15) {
    await Notification.create({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      type: 'battery_low',
      title: 'Low Battery Alert',
      message: `Staff ${req.user.firstName} ${req.user.lastName}'s device battery is low (${batteryLevel}%).`,
      link: '/tracking'
    });
  }

  // Emit Socket.IO real-time location update event
  const io = req.app.get('io');
  if (io) {
    io.emit('staff_location_update', {
      dutySessionId: session._id,
      staffId: req.user._id,
      staffName: `${req.user.firstName} ${req.user.lastName}`,
      employeeId: req.user.employeeId,
      branchId: session.branchId,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      batteryLevel,
      isInternetConnected,
      isGpsEnabled,
      timestamp: locationPoint.timestamp,
      totalDistanceKm: session.totalDistanceKm
    });
  }

  res.status(200).json(new ApiResponse(200, 'Telemetry saved successfully', {
    trackingActive: true,
    totalDistanceKm: session.totalDistanceKm,
    locationPoint
  }));
});

// GET /api/v1/tracking/active - Fetch all currently active duty staff with live positions
export const getActiveDutyStaff = asyncHandler(async (req, res) => {
  const query = { dutyStatus: 'ON_DUTY' };

  // Branch Admins only see staff assigned to their own branch
  if (req.user.role === 'branch_admin' && req.user.branchId) {
    query.branchId = req.user.branchId;
  }

  const activeStaff = await Staff.find(query)
    .populate('branchId', 'name code')
    .select('-password');

  const activeStaffIds = activeStaff.map(s => s._id);

  // Fetch active sessions
  const activeSessions = await DutySession.find({
    staffId: { $in: activeStaffIds },
    status: 'ON_DUTY'
  });

  const sessionMap = new Map();
  activeSessions.forEach(s => sessionMap.set(s.staffId.toString(), s));

  // Fetch latest location for each active staff
  const activeData = await Promise.all(
    activeStaff.map(async (staff) => {
      const session = sessionMap.get(staff._id.toString());
      let latestLocation = null;
      if (session) {
        latestLocation = await StaffLocation.findOne({ dutySessionId: session._id }).sort({ timestamp: -1 });
      }

      return {
        staff,
        session,
        latestLocation
      };
    })
  );

  res.status(200).json(new ApiResponse(200, 'Active tracking staff retrieved successfully', activeData));
});

// GET /api/v1/tracking/history/:dutySessionId - Fetch complete route path and timeline for a duty session
export const getDutySessionHistory = asyncHandler(async (req, res) => {
  const { dutySessionId } = req.params;

  const session = await DutySession.findById(dutySessionId)
    .populate('staffId', 'firstName lastName employeeId phone email avatar')
    .populate('branchId', 'name code address');

  if (!session) {
    throw new ApiError(404, 'Duty session record not found');
  }

  // Branch Admins restricted to their branch staff history
  if (req.user.role === 'branch_admin' && req.user.branchId) {
    if (session.branchId._id.toString() !== req.user.branchId.toString()) {
      throw new ApiError(403, 'Unauthorized access to other branch staff history');
    }
  }

  const locations = await StaffLocation.find({ dutySessionId }).sort({ timestamp: 1 });

  // Generate timeline markers (Start, Stops, Max Speed, End)
  const timeline = [];
  if (locations.length > 0) {
    timeline.push({
      time: session.startTime,
      type: 'EXIT_GATE',
      title: 'Exited Office / Duty Started',
      description: `Gate exit clearance recorded at ${session.branchId?.name || 'Branch'}`
    });

    // Detect idle stops (> 5 mins stationary)
    let idleStart = null;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      const speed = curr.speed || 0;

      if (speed <= 2) {
        if (!idleStart) idleStart = curr;
      } else {
        if (idleStart) {
          const durationMins = Math.round((new Date(curr.timestamp).getTime() - new Date(idleStart.timestamp).getTime()) / 60000);
          if (durationMins >= 5) {
            timeline.push({
              time: idleStart.timestamp,
              type: 'STOP',
              title: `Idle Stop (${durationMins} mins)`,
              description: `Lat: ${idleStart.latitude.toFixed(4)}, Lon: ${idleStart.longitude.toFixed(4)}`
            });
          }
          idleStart = null;
        }
      }
    }

    if (session.endTime) {
      timeline.push({
        time: session.endTime,
        type: 'ENTRY_GATE',
        title: 'Returned to Office / Duty Ended',
        description: `Duty closed. Total distance covered: ${session.totalDistanceKm ? session.totalDistanceKm.toFixed(2) : 0} km`
      });
    }
  }

  res.status(200).json(new ApiResponse(200, 'Duty session history retrieved successfully', {
    session,
    locations,
    timeline
  }));
});

// GET /api/v1/tracking/reports - Generate duty and location tracking summary reports
export const getTrackingReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, branchId, staffId, startDate, endDate, status } = req.query;

  const query = {};

  if (req.user.role === 'branch_admin' && req.user.branchId) {
    query.branchId = req.user.branchId;
  } else if (branchId) {
    query.branchId = branchId;
  }

  if (staffId) query.staffId = staffId;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.startTime.$lte = end;
    }
  }

  const skip = (page - 1) * limit;
  const total = await DutySession.countDocuments(query);

  const sessions = await DutySession.find(query)
    .populate('staffId', 'firstName lastName employeeId email phone')
    .populate('branchId', 'name code')
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json(new ApiResponse(200, 'Duty tracking reports retrieved successfully', sessions, {
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit)
  }));
});
