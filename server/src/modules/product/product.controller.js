import Product from './product.model.js';
import ProductCategory from './productCategory.model.js';
import ProductHistory from './productHistory.model.js';
import Inventory from '../inventory/inventory.model.js';
import StockMovement from '../inventory/stockMovement.model.js';
import Branch from '../branch/branch.model.js';
import QRCode from '../qr/qrCode.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getNextSequence, generatePaginationMeta } from '../../utils/helpers.js';
import crypto from 'crypto';

// --- CATEGORIES ---
export const createProductCategory = asyncHandler(async (req, res) => {
  const { name, code, description, prefix } = req.body;

  if (!name || !code || !prefix) {
    throw new ApiError(400, 'Category name, unique code, and prefix (e.g., GPS, CAM) are required');
  }

  const existingCategory = await ProductCategory.findOne({
    $or: [{ code: code.toUpperCase() }, { prefix: prefix.toUpperCase() }]
  });

  if (existingCategory) {
    throw new ApiError(400, 'Product Category with this code or prefix already exists');
  }

  const category = await ProductCategory.create({
    organizationId: req.user.organizationId,
    name,
    code: code.toUpperCase(),
    description,
    prefix: prefix.toUpperCase()
  });

  res.status(201).json(new ApiResponse(201, 'Category created successfully', category));
});

export const getProductCategories = asyncHandler(async (req, res) => {
  const categories = await ProductCategory.find({ isDeleted: { $ne: true } });
  res.status(200).json(new ApiResponse(200, 'Categories retrieved successfully', categories));
});


// --- PRODUCTS ---
export const createProduct = asyncHandler(async (req, res) => {
  const { name, categoryId, serialNumber, imei, model, batch, vendor, purchaseDate, warranty, currentBranchId, notes } = req.body;

  if (!name || !categoryId || !currentBranchId) {
    throw new ApiError(400, 'Product name, category, and initial location (branch) are required');
  }

  const category = await ProductCategory.findById(categoryId);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const branch = await Branch.findById(currentBranchId);
  if (!branch) {
    throw new ApiError(404, 'Branch not found');
  }

  if (serialNumber) {
    const existingSerial = await Product.findOne({ serialNumber });
    if (existingSerial) {
      throw new ApiError(400, `Product with Serial Number ${serialNumber} already exists`);
    }
  }

  if (imei) {
    const existingImei = await Product.findOne({ imei });
    if (existingImei) {
      throw new ApiError(400, `Product with IMEI ${imei} already exists`);
    }
  }

  // Auto-generate Product ID: Category prefix (e.g. GPS) + 6-digit sequence (e.g. GPS000001)
  const productId = await getNextSequence(category.prefix, category.prefix, 6);

  const product = await Product.create({
    organizationId: req.user.organizationId,
    productId,
    name,
    category: categoryId,
    serialNumber,
    imei,
    model,
    batch,
    vendor,
    purchaseDate,
    warranty,
    currentBranchId,
    notes,
    status: 'available'
  });

  // Create Inventory Record
  await Inventory.create({
    productId: product._id,
    branchId: currentBranchId,
    status: 'available',
    updatedBy: req.user._id
  });

  // Write Immutable Product History
  await ProductHistory.create({
    productId: product._id,
    action: 'created',
    toBranchId: currentBranchId,
    staffId: req.user._id,
    notes: 'Initial creation in Arshi ERP'
  });

  // Write Immutable Stock Movement
  await StockMovement.create({
    productId: product._id,
    toBranchId: currentBranchId,
    type: 'initial',
    performedBy: req.user._id,
    notes: 'Initial stock addition'
  });

  res.status(201).json(new ApiResponse(201, 'Product created successfully', product));
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', status, category, branchId } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) query.status = status;
  if (category) query.category = category;
  if (branchId) query.currentBranchId = branchId;

  // Branch Admins and Store Managers can only view their own branch stock
  if (req.user.role !== 'super_admin' && req.user.branchId) {
    query.currentBranchId = req.user.branchId;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { productId: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
      { imei: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name code prefix')
    .populate('currentBranchId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json(
    new ApiResponse(
      200,
      'Products retrieved successfully',
      products,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name code prefix')
    .populate('currentBranchId', 'name code')
    .populate('currentHolderId', 'firstName lastName employeeId');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Access check
  if (req.user.role !== 'super_admin' && req.user.branchId && !product.currentBranchId?.equals(req.user.branchId)) {
    throw new ApiError(403, 'Access denied: Product does not belong to your branch');
  }

  res.status(200).json(new ApiResponse(200, 'Product retrieved successfully', product));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { 
    name, 
    category, 
    categoryId, 
    serialNumber, 
    imei, 
    model, 
    batch, 
    vendor, 
    status, 
    condition, 
    purchasePrice, 
    purchaseDate, 
    warranty, 
    currentBranchId, 
    notes 
  } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Access check for branch admins
  if (req.user.role !== 'super_admin' && req.user.branchId && !product.currentBranchId?.equals(req.user.branchId)) {
    throw new ApiError(403, 'Access denied: You can only edit products belonging to your branch');
  }

  if (name !== undefined) product.name = name;
  if (category || categoryId) product.category = categoryId || category;
  if (serialNumber !== undefined) product.serialNumber = serialNumber;
  if (imei !== undefined) product.imei = imei;
  if (model !== undefined) product.model = model;
  if (batch !== undefined) product.batch = batch;
  if (vendor !== undefined) product.vendor = vendor;
  if (status !== undefined) product.status = status;
  if (condition !== undefined) product.condition = condition;
  if (purchasePrice !== undefined) product.purchasePrice = purchasePrice;
  if (purchaseDate !== undefined) product.purchaseDate = purchaseDate;
  if (warranty !== undefined) product.warranty = warranty;
  if (currentBranchId !== undefined && req.user.role === 'super_admin') product.currentBranchId = currentBranchId;
  if (notes !== undefined) product.notes = notes;

  await product.save();
  const updatedProduct = await Product.findById(product._id)
    .populate('category', 'name code prefix')
    .populate('currentBranchId', 'name code');

  res.status(200).json(new ApiResponse(200, 'Product updated successfully', updatedProduct));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Soft delete
  product.isDeleted = true;
  product.deletedAt = new Date();
  product.deletedBy = req.user._id;
  await product.save();

  // Delete from inventory representation
  await Inventory.deleteOne({ productId: product._id });

  res.status(200).json(new ApiResponse(200, 'Product soft-deleted successfully'));
});

export const generateProductQR = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('currentBranchId', 'name');
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // CORE RULE: Only the Organization (super_admin) can generate QR codes.
  if (req.user.role !== 'super_admin') {
    throw new ApiError(403, 'CORE RULE: Only the main organization can generate QR Codes');
  }

  const qrCodeUUID = crypto.randomUUID();
  const branchName = product.currentBranchId ? product.currentBranchId.name : 'Main Organization';

  // Payload structure as requested:
  // Product ID, Serial Number, IMEI, Model, Batch, Current Branch, Current Status
  const qrPayload = {
    productId: product.productId,
    serialNumber: product.serialNumber || 'N/A',
    imei: product.imei || 'N/A',
    model: product.model || 'N/A',
    batch: product.batch || 'N/A',
    currentBranch: branchName,
    currentStatus: product.status
  };

  // Revoke existing if generated before
  if (product.qrCode) {
    await QRCode.findOneAndUpdate({ code: product.qrCode }, { status: 'revoked' });
  }

  const qrDoc = await QRCode.create({
    organizationId: req.user.organizationId,
    entityType: 'product',
    entityId: product._id,
    code: qrCodeUUID,
    payload: qrPayload,
    generatedBy: req.user._id
  });

  product.qrCode = qrCodeUUID;
  await product.save();

  res.status(200).json(new ApiResponse(200, 'Product QR Code generated successfully', qrDoc));
});

export const getProductHistory = asyncHandler(async (req, res) => {
  const history = await ProductHistory.find({ productId: req.params.id })
    .populate('fromBranchId', 'name code')
    .populate('toBranchId', 'name code')
    .populate('staffId', 'firstName lastName employeeId')
    .populate('securityGuardId', 'firstName lastName employeeId')
    .sort({ timestamp: -1 });

  res.status(200).json(new ApiResponse(200, 'Product history retrieved successfully', history));
});

export const searchProducts = asyncHandler(async (req, res) => {
  const q = (req.query.q || req.query.imei || req.query.query || '').trim();

  if (!q) {
    return res.status(200).json(new ApiResponse(200, 'Products search query empty', []));
  }

  const query = {
    isDeleted: { $ne: true },
    $or: [
      { imei: { $regex: q, $options: 'i' } },
      { productId: { $regex: q, $options: 'i' } },
      { serialNumber: { $regex: q, $options: 'i' } },
      { qrCode: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
      { model: { $regex: q, $options: 'i' } }
    ]
  };

  const products = await Product.find(query)
    .populate('category', 'name code prefix')
    .populate('currentBranchId', 'name code email phone address contactPerson status managerName')
    .populate('currentHolderId', 'firstName lastName employeeId email phone fatherName alternatePhone aadharNumber panNumber addressDetails joiningDate designation bloodGroup emergencyContact status qrCode avatar')
    .sort({ updatedAt: -1 })
    .limit(20);

  res.status(200).json(new ApiResponse(200, 'Products found', products));
});
