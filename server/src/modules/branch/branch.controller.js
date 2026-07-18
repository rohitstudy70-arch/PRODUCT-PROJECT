import Branch from './branch.model.js';
import Organization from '../organization/organization.model.js';
import Staff from '../staff/staff.model.js';
import Counter from '../counter/counter.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generatePaginationMeta } from '../../utils/helpers.js';
import crypto from 'crypto';

export const createBranch = asyncHandler(async (req, res) => {
  const { name, code, email, phone, address, contactPerson, adminEmail, adminPassword } = req.body;

  if (!name || !code || !address || !address.city || !address.state) {
    throw new ApiError(400, 'Branch name, unique code, city, and state are required');
  }

  // Verify unique branch code
  const existingBranch = await Branch.findOne({ code: code.toUpperCase() });
  if (existingBranch) {
    throw new ApiError(400, `Branch with code ${code.toUpperCase()} already exists`);
  }

  // Get first active organization (for simple organization-wide ownership)
  const org = await Organization.findOne({ status: 'active' });
  if (!org) {
    throw new ApiError(500, 'Organization setting not initialized. Run seeds first.');
  }

  const branch = await Branch.create({
    organizationId: org._id,
    name,
    code: code.toUpperCase(),
    email,
    phone,
    address,
    contactPerson,
    createdBy: req.user._id
  });

  // Automatically create a Branch Admin if email and password are provided
  if (adminEmail && adminPassword) {
    // Generate unique employee ID sequence
    const counter = await Counter.findOneAndUpdate(
      { name: 'employee' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const employeeId = `EMP${String(counter.seq).padStart(5, '0')}`;

    await Staff.create({
      organizationId: org._id,
      branchId: branch._id,
      firstName: `${name}`,
      lastName: 'Admin',
      email: adminEmail,
      password: adminPassword,
      phone: phone || '+910000000000',
      role: 'branch_admin',
      employeeId,
      qrCode: crypto.randomUUID(),
      status: 'active'
    });
  }

  res.status(201).json(new ApiResponse(201, 'Branch created successfully', branch));
});

export const getAllBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', status } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Branch.countDocuments(query);
  const branches = await Branch.find(query)
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json(
    new ApiResponse(
      200,
      'Branches retrieved successfully',
      branches,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getBranchById = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');

  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  res.status(200).json(new ApiResponse(200, 'Branch retrieved successfully', branch));
});

export const updateBranch = asyncHandler(async (req, res) => {
  const { name, email, phone, address, contactPerson, status } = req.body;

  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  if (name) branch.name = name;
  if (email) branch.email = email;
  if (phone) branch.phone = phone;
  if (address) branch.address = address;
  if (contactPerson) branch.contactPerson = contactPerson;
  if (status) branch.status = status;

  await branch.save();

  res.status(200).json(new ApiResponse(200, 'Branch updated successfully', branch));
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  // Soft delete
  branch.isDeleted = true;
  branch.deletedAt = new Date();
  branch.deletedBy = req.user._id;
  await branch.save();

  res.status(200).json(new ApiResponse(200, 'Branch soft-deleted successfully'));
});
