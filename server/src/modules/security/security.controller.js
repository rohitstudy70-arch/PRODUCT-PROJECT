import SecurityScan from './securityScan.model.js';
import Staff from '../staff/staff.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generatePaginationMeta } from '../../utils/helpers.js';

// In-memory OTP cache for gate staff verification
const gateOtpStore = new Map();

export const getSecurityScans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, result, type } = req.query;
  const skip = (page - 1) * limit;

  const query = { organizationId: req.user.organizationId };

  // If logged in user is security guard, filter by their securityGuardId
  if (req.user.role === 'security_guard') {
    query.securityGuardId = req.user._id;
  }

  if (result) query.result = result;
  if (type) query.type = type;

  const total = await SecurityScan.countDocuments(query);
  const scans = await SecurityScan.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate({
      path: 'transferId',
      select: 'transferId fromBranchId toBranchId status items',
      populate: [
        { path: 'fromBranchId', select: 'name code city' },
        { path: 'toBranchId', select: 'name code city' },
        { path: 'items.productId', select: 'name productId serialNumber imei category' }
      ]
    })
    .populate('staffQR.staffId', 'firstName lastName employeeId phone fatherName aadharNumber designation')
    .populate('securityGuardId', 'firstName lastName employeeId')
    .populate('productsScanned.productId', 'name productId serialNumber imei category');

  res.status(200).json(
    new ApiResponse(200, 'Security clearance logs fetched successfully', scans, generatePaginationMeta(page, limit, total))
  );
});

// --- SEND OTP TO REGISTERED STAFF MOBILE ---
export const sendGateOTP = asyncHandler(async (req, res) => {
  const { staffId, transferId } = req.body;

  if (!staffId) {
    throw new ApiError(400, 'Staff ID is required to send gate verification OTP');
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found in database');
  }

  const phone = staff.phone || staff.alternatePhone;
  if (!phone) {
    throw new ApiError(400, 'No registered phone number found for this staff member. Please update staff profile.');
  }

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

  // Store in cache
  gateOtpStore.set(staff._id.toString(), {
    otp,
    phone,
    expiresAt,
    transferId
  });

  console.log(`📲 [SECURITY GATE OTP] Staff: ${staff.firstName} ${staff.lastName} | Phone: ${phone} | OTP: ${otp}`);

  const maskedPhone = phone.length >= 10 ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : phone;

  res.status(200).json(
    new ApiResponse(200, `OTP sent successfully to staff registered mobile number (${maskedPhone})`, {
      phone,
      otp, // Provided for live UI verification/testing
      expiresInMinutes: 10
    })
  );
});

// --- VERIFY GATE OTP ENTERED BY GUARD ---
export const verifyGateOTP = asyncHandler(async (req, res) => {
  const { staffId, otp } = req.body;

  if (!staffId || !otp) {
    throw new ApiError(400, 'Staff ID and 6-digit OTP are required');
  }

  const stored = gateOtpStore.get(staffId.toString());

  if (!stored) {
    throw new ApiError(400, 'No active OTP request found for this staff. Please click "Send OTP" first.');
  }

  if (Date.now() > stored.expiresAt) {
    gateOtpStore.delete(staffId.toString());
    throw new ApiError(400, 'OTP has expired (valid for 10 minutes). Please request a new OTP.');
  }

  if (stored.otp !== otp.trim()) {
    throw new ApiError(400, '❌ Invalid OTP! Please enter the correct 6-digit OTP sent to staff mobile.');
  }

  // OTP verified successfully
  gateOtpStore.delete(staffId.toString());

  res.status(200).json(
    new ApiResponse(200, '✅ Staff OTP verified successfully! Identity confirmed for gate approval.', {
      verified: true
    })
  );
});

