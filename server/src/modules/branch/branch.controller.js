import Branch from './branch.model.js';
import Organization from '../organization/organization.model.js';
import Staff from '../staff/staff.model.js';
import Counter from '../../utils/counter.model.js';
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
    .limit(parseInt(limit, 10))
    .lean();

  // Attach assigned Branch Admin account details for Super Admin management
  const branchIds = branches.map(b => b._id);
  const admins = await Staff.find({
    branchId: { $in: branchIds },
    role: 'branch_admin'
  }).select('firstName lastName email phone branchId _id employeeId');

  const branchesWithAdmin = branches.map(b => {
    const admin = admins.find(a => a.branchId && a.branchId.toString() === b._id.toString());
    return {
      ...b,
      adminUser: admin || null
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      'Branches retrieved successfully',
      branchesWithAdmin,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getBranchById = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email')
    .lean();

  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  const admin = await Staff.findOne({ branchId: branch._id, role: 'branch_admin' })
    .select('firstName lastName email phone _id employeeId');

  res.status(200).json(new ApiResponse(200, 'Branch retrieved successfully', {
    ...branch,
    adminUser: admin || null
  }));
});

export const updateBranch = asyncHandler(async (req, res) => {
  const { name, email, phone, address, contactPerson, status, adminEmail, adminPassword } = req.body;

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

  // Update or Create Branch Admin credentials if requested by Super Admin
  if (adminEmail || adminPassword) {
    let branchAdmin = await Staff.findOne({ branchId: branch._id, role: 'branch_admin' });

    if (branchAdmin) {
      if (adminEmail) branchAdmin.email = adminEmail;
      if (adminPassword) branchAdmin.password = adminPassword; // Pre-save hook hashes password
      await branchAdmin.save();
    } else if (adminEmail && adminPassword) {
      const org = await Organization.findOne({ status: 'active' });
      const counter = await Counter.findOneAndUpdate(
        { name: 'employee' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const employeeId = `EMP${String(counter.seq).padStart(5, '0')}`;

      await Staff.create({
        organizationId: org._id,
        branchId: branch._id,
        firstName: `${branch.name}`,
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
  }

  res.status(200).json(new ApiResponse(200, 'Branch and admin credentials updated successfully', branch));
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
