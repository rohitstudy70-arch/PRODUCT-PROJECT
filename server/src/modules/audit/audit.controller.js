import AuditLog from './auditLog.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generatePaginationMeta } from '../../utils/helpers.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, module, action, userId } = req.query;

  const query = {};
  if (module) query.module = module;
  if (action) query.action = action;
  if (userId) query.userId = userId;

  const skip = (page - 1) * limit;
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .populate('userId', 'firstName lastName employeeId')
    .populate('branchId', 'name code')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.status(200).json(
    new ApiResponse(
      200,
      'Audit logs retrieved successfully',
      logs,
      generatePaginationMeta(page, limit, total)
    )
  );
});

export const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate('userId', 'firstName lastName employeeId')
    .populate('branchId', 'name code');

  if (!log) {
    throw new ApiError(404, 'Audit record not found');
  }

  res.status(200).json(new ApiResponse(200, 'Audit record retrieved successfully', log));
});
