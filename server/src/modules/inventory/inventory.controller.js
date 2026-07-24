import mongoose from 'mongoose';
import Inventory from './inventory.model.js';
import StockMovement from './stockMovement.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generatePaginationMeta } from '../../utils/helpers.js';

export const getInventory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 100, search = '', status, branchId } = req.query;

  const query = {};

  if (status) query.status = status;
  if (branchId) query.branchId = branchId;

  // Branch isolation rule
  if (req.user.role !== 'super_admin' && req.user.branchId) {
    query.branchId = req.user.branchId;
  }

  const skip = (page - 1) * limit;

  // Find products matching the search query
  let productIds = [];
  if (search) {
    // We would fetch matching product IDs
    const products = await mongoose.model('Product').find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { imei: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    productIds = products.map(p => p._id);
    query.productId = { $in: productIds };
  }

  const total = await Inventory.countDocuments(query);
  const inventoryItems = await Inventory.find(query)
    .populate({
      path: 'productId',
      populate: { path: 'category', select: 'name prefix' }
    })
    .populate('branchId', 'name code')
    .populate('assignedTo', 'firstName lastName employeeId')
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort({ updatedAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      'Inventory retrieved successfully',
      inventoryItems,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getStockMovements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, productId, type } = req.query;

  const query = {};
  if (productId) query.productId = productId;
  if (type) query.type = type;

  // Scope validation
  if (req.user.role !== 'super_admin' && req.user.branchId) {
    query.$or = [
      { fromBranchId: req.user.branchId },
      { toBranchId: req.user.branchId }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await StockMovement.countDocuments(query);
  const movements = await StockMovement.find(query)
    .populate('productId', 'name productId serialNumber')
    .populate('fromBranchId', 'name code')
    .populate('toBranchId', 'name code')
    .populate('performedBy', 'firstName lastName role')
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort({ timestamp: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      'Stock movements retrieved successfully',
      movements,
      generatePaginationMeta(page, limit, total)
    )
  );
});
