import SecurityScan from './securityScan.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { generatePaginationMeta } from '../../utils/helpers.js';

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
