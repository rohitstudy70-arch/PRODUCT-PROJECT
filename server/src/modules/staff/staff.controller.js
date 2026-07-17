import Staff from './staff.model.js';
import Branch from '../branch/branch.model.js';
import QRCode from '../qr/qrCode.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getNextSequence, generatePaginationMeta } from '../../utils/helpers.js';
import crypto from 'crypto';

export const createStaff = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role, branchId } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    throw new ApiError(400, 'First name, last name, email, password, and role are required');
  }

  // Verify unique email
  const existingStaff = await Staff.findOne({ email });
  if (existingStaff) {
    throw new ApiError(400, 'Staff member with this email already exists');
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
    employeeId,
    firstName,
    lastName,
    email,
    password,
    phone,
    role
  });

  const response = staff.toObject();
  delete response.password;

  res.status(201).json(new ApiResponse(201, 'Staff member created successfully', response));
});

export const getAllStaff = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role, branchId, status } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (role) query.role = role;
  if (branchId) query.branchId = branchId;
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Staff.countDocuments(query);
  const staffList = await Staff.find(query)
    .populate('branchId', 'name code')
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
  const staff = await Staff.findById(req.params.id).populate('branchId', 'name code');
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  res.status(200).json(new ApiResponse(200, 'Staff details retrieved successfully', staff));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, status } = req.body;

  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (firstName) staff.firstName = firstName;
  if (lastName) staff.lastName = lastName;
  if (phone) staff.phone = phone;
  if (status) staff.status = status;

  await staff.save();

  const response = staff.toObject();
  
  res.status(200).json(new ApiResponse(200, 'Staff member updated successfully', response));
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    throw new ApiError(404, 'Staff member not found');
  }

  if (staff._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  // Soft delete
  staff.isDeleted = true;
  staff.deletedAt = new Date();
  staff.deletedBy = req.user._id;
  await staff.save();

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
    staff.branchId = branchId;
  } else {
    staff.branchId = null; // Unassign branch (Head office assignment)
  }

  await staff.save();
  res.status(200).json(new ApiResponse(200, 'Branch assignment updated successfully', staff));
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

  staff.role = role;
  await staff.save();

  res.status(200).json(new ApiResponse(200, 'Role assignment updated successfully', staff));
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

  // Assign QR Code string to staff
  staff.qrCode = qrCodeUUID;
  await staff.save();

  res.status(200).json(new ApiResponse(200, 'Staff QR Code generated successfully', qrDoc));
});
