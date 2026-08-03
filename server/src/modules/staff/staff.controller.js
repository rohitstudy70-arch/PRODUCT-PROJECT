import Staff from './staff.model.js';
import Branch from '../branch/branch.model.js';
import QRCode from '../qr/qrCode.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getNextSequence, generatePaginationMeta } from '../../utils/helpers.js';
import crypto from 'crypto';

export const createStaff = asyncHandler(async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    password, 
    phone, 
    role, 
    branchId,
    fatherName,
    alternatePhone,
    aadharNumber,
    panNumber,
    designation,
    addressDetails,
    rfidCard
  } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    throw new ApiError(400, 'First name, last name, email, password, and role are required');
  }

  // Verify unique email
  const existingStaff = await Staff.findOne({ email });
  if (existingStaff) {
    throw new ApiError(400, 'Staff member with this email already exists');
  }

  // Verify unique RFID Card if provided
  const cleanRfid = rfidCard ? rfidCard.trim() : null;
  if (cleanRfid) {
    const existingRfid = await Staff.findOne({ rfidCard: cleanRfid });
    if (existingRfid) {
      throw new ApiError(400, `RFID Card ${cleanRfid} is already assigned to ${existingRfid.firstName} ${existingRfid.lastName} (${existingRfid.employeeId})`);
    }
  }

  // Validate branch assignment if provided
  if (branchId) {
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(404, 'Assigned branch not found');
    }
  }

  // Generate unique employee ID (EMP00001)
  const employeeId = await getNextSequence('employee', 'EMP', 5);

  const staff = await Staff.create({
    organizationId: req.user.organizationId,
    branchId: branchId || null,
    currentBranchId: branchId || null,
    employeeId,
    firstName,
    lastName,
    email,
    password,
    phone,
    role,
    rfidCard: cleanRfid,
    fatherName: fatherName || '',
    alternatePhone: alternatePhone || '',
    aadharNumber: aadharNumber || '',
    panNumber: panNumber || '',
    designation: designation || (role === 'staff' ? 'Delivery Staff / Courier' : role.replace('_', ' ').toUpperCase()),
    addressDetails: addressDetails || { street: '', district: '', state: '', pincode: '' }
  });

  const response = staff.toObject();
  delete response.password;

  res.status(201).json(new ApiResponse(201, 'Staff member created successfully', response));
});

export const getAllStaff = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role, branchId, currentBranchId, status } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (role) query.role = role;
  if (currentBranchId) {
    query.$or = [{ currentBranchId: currentBranchId }, { branchId: currentBranchId }, { currentBranchId: null }];
  } else if (branchId) {
    query.branchId = branchId;
  }
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { aadharNumber: { $regex: search, $options: 'i' } },
      { rfidCard: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Staff.countDocuments(query);
  const staffList = await Staff.find(query)
    .populate('branchId', 'name code')
    .populate('currentBranchId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json(
    new ApiResponse(
      200,
      'Staff members retrieved successfully',
      staffList,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getStaffById = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id)
    .populate('branchId', 'name code')
    .populate('currentBranchId', 'name code')
    .select('-password');
    
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  res.status(200).json(new ApiResponse(200, 'Staff details retrieved successfully', staff));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { 
    firstName, 
    lastName, 
    phone, 
    status,
    fatherName,
    alternatePhone,
    aadharNumber,
    panNumber,
    designation,
    addressDetails,
    role,
    branchId,
    rfidCard
  } = req.body;

  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  // Build $set update object instead of using save() to avoid
  // Mongoose pre-save hook & password validation issues (password has select:false + required:true)
  const updateFields = {};

  if (firstName) updateFields.firstName = firstName;
  if (lastName) updateFields.lastName = lastName;
  if (phone) updateFields.phone = phone;
  if (status) updateFields.status = status;
  if (fatherName !== undefined) updateFields.fatherName = fatherName;
  if (alternatePhone !== undefined) updateFields.alternatePhone = alternatePhone;
  if (aadharNumber !== undefined) updateFields.aadharNumber = aadharNumber;
  if (panNumber !== undefined) updateFields.panNumber = panNumber;
  if (designation !== undefined) updateFields.designation = designation;
  if (role) updateFields.role = role;
  if (branchId !== undefined) updateFields.branchId = branchId || null;
  if (addressDetails) updateFields.addressDetails = addressDetails;
  
  if (rfidCard !== undefined) {
    const cleanRfid = rfidCard ? String(rfidCard).trim() : null;
    if (cleanRfid) {
      const existing = await Staff.findOne({ rfidCard: cleanRfid, _id: { $ne: staff._id } });
      if (existing) {
        throw new ApiError(400, `RFID Card ${cleanRfid} is already assigned to ${existing.firstName} ${existing.lastName} (${existing.employeeId})`);
      }
    }
    updateFields.rfidCard = cleanRfid;
  }

  const updatedStaff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json(new ApiResponse(200, 'Staff member updated successfully', updatedStaff));
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (staff._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  // Soft delete using findByIdAndUpdate to bypass pre-save password validation
  await Staff.findByIdAndUpdate(req.params.id, {
    $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }
  });

  res.status(200).json(new ApiResponse(200, 'Staff member soft-deleted successfully'));
});

export const assignBranch = asyncHandler(async (req, res) => {
  const { branchId } = req.body;

  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (branchId) {
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(404, 'Branch not found');
    }
  }

  const updatedStaff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: { branchId: branchId || null } },
    { new: true, runValidators: true }
  ).select('-password');
  res.status(200).json(new ApiResponse(200, 'Branch assignment updated successfully', updatedStaff));
});

export const assignRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!role) {
    throw new ApiError(400, 'Role is required');
  }

  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  const updatedStaff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: { role } },
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json(new ApiResponse(200, 'Role assignment updated successfully', updatedStaff));
});

export const generateStaffQR = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id).populate('branchId', 'name code');
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  // CORE RULE: Only the Organization (super_admin) can generate QR codes.
  if (req.user.role !== 'super_admin') {
    throw new ApiError(403, 'CORE RULE: Only the main organization can generate QR Codes');
  }

  const branchName = staff.branchId ? staff.branchId.name : 'Main Head Office';
  const qrCodeUUID = crypto.randomUUID();

  // Create QR Code payload
  const qrPayload = {
    employeeId: staff.employeeId,
    name: `${staff.firstName} ${staff.lastName}`,
    branch: branchName,
    role: staff.role,
    status: staff.status,
    createdDate: new Date()
  };

  // Check if staff already has a QR Code and revoke it
  if (staff.qrCode) {
    await QRCode.findOneAndUpdate({ code: staff.qrCode }, { status: 'revoked' });
  }

  // Create QRCode document
  const qrDoc = await QRCode.create({
    organizationId: req.user.organizationId,
    entityType: 'staff',
    entityId: staff._id,
    code: qrCodeUUID,
    payload: qrPayload,
    generatedBy: req.user._id
  });

  // Assign QR Code string to staff using findByIdAndUpdate
  await Staff.findByIdAndUpdate(staff._id, { $set: { qrCode: qrCodeUUID } });

  res.status(200).json(new ApiResponse(200, 'Staff QR Code generated successfully', qrDoc));
});

export const toggleStaffDutyStatus = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  const DutySession = (await import('../tracking/dutySession.model.js')).default;

  // Use findByIdAndUpdate to bypass pre-save password validation
  const updatedStaff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: { dutyStatus: staff.dutyStatus === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY' } },
    { new: true }
  ).select('-password');

  if (staff.dutyStatus === 'ON_DUTY') {
    // Was ON_DUTY, now going OFF_DUTY
    const activeSession = await DutySession.findOne({ staffId: staff._id, status: 'ON_DUTY' });
    if (activeSession) {
      activeSession.status = 'COMPLETED';
      activeSession.endTime = new Date();
      await activeSession.save();
    }
    await Staff.findByIdAndUpdate(req.params.id, { $set: { activeDutySessionId: null } });
  } else {
    // Was OFF_DUTY, now going ON_DUTY
    let activeSession = await DutySession.findOne({ staffId: staff._id, status: 'ON_DUTY' });
    if (!activeSession) {
      activeSession = await DutySession.create({
        organizationId: staff.organizationId,
        staffId: staff._id,
        branchId: staff.branchId,
        status: 'ON_DUTY',
        startTime: new Date()
      });
    }
    await Staff.findByIdAndUpdate(req.params.id, { $set: { activeDutySessionId: activeSession._id } });
  }

  const finalStaff = await Staff.findById(req.params.id).select('-password');
  res.status(200).json(new ApiResponse(200, `Duty status updated to ${finalStaff.dutyStatus}`, finalStaff));
});

export const scanStaffRfid = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    throw new ApiError(400, 'RFID Card ID or Employee ID code is required');
  }

  const cleanCode = code.trim();
  const firstToken = cleanCode.split(/\s+/)[0];
  
  // Search by rfidCard (exact, token, or regex), employeeId, or qrCode
  const staff = await Staff.findOne({
    $or: [
      { rfidCard: cleanCode },
      { rfidCard: firstToken },
      { rfidCard: { $regex: cleanCode, $options: 'i' } },
      { rfidCard: { $regex: firstToken, $options: 'i' } },
      { employeeId: { $regex: `^${cleanCode}$`, $options: 'i' } },
      { qrCode: cleanCode }
    ],
    isDeleted: { $ne: true }
  })
    .populate('branchId', 'name code')
    .populate('currentBranchId', 'name code')
    .select('-password');

  if (!staff) {
    throw new ApiError(404, `No staff member found matching RFID/ID Card: ${cleanCode}`);
  }

  // Fetch staff's currently assigned active in-transit products
  const Product = (await import('../product/product.model.js')).default;
  const activeAssignedProducts = await Product.find({
    currentHolderId: staff._id,
    isDeleted: { $ne: true }
  }).select('productId modelName serialNumber imei status currentBranchId updatedAt');

  res.status(200).json(new ApiResponse(200, 'Staff identified successfully via RFID Card', {
    staff,
    activeAssignedProducts
  }));
});

export const assignStaffRfid = asyncHandler(async (req, res) => {
  const { rfidCard } = req.body;
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  const cleanRfid = rfidCard ? String(rfidCard).trim() : null;
  if (cleanRfid) {
    const existing = await Staff.findOne({ rfidCard: cleanRfid, _id: { $ne: staff._id } });
    if (existing) {
      throw new ApiError(400, `RFID Card ${cleanRfid} is already assigned to ${existing.firstName} ${existing.lastName} (${existing.employeeId})`);
    }
  }

  // Use findByIdAndUpdate instead of save() to bypass pre-save password validation
  const updatedStaff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: { rfidCard: cleanRfid } },
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json(new ApiResponse(200, `RFID Card ${cleanRfid ? 'assigned' : 'removed'} successfully`, updatedStaff));
});
