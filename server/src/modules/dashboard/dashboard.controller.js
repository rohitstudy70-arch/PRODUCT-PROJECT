import Product from '../product/product.model.js';
import Transfer from '../transfer/transfer.model.js';
import Staff from '../staff/staff.model.js';
import Branch from '../branch/branch.model.js';
import SecurityScan from '../security/securityScan.model.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const globalQuery = { isDeleted: { $ne: true } };
  const transferQuery = {};

  if (req.user.role !== 'super_admin' && req.user.branchId) {
    transferQuery.$or = [
      { fromBranchId: req.user.branchId },
      { toBranchId: req.user.branchId }
    ];
  }

  // Count global enterprise products by status (Always fetches all 7 products)
  const totalProducts = await Product.countDocuments(globalQuery);
  const availableProducts = await Product.countDocuments({ ...globalQuery, status: 'available' });
  const inTransitProducts = await Product.countDocuments({ ...globalQuery, status: 'in_transit' });
  const assignedProducts = await Product.countDocuments({ ...globalQuery, status: 'assigned' });
  const missingProducts = await Product.countDocuments({ ...globalQuery, status: 'missing' });
  const scrappedProducts = await Product.countDocuments({ ...globalQuery, status: 'scrapped' });

  // Count transfers
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTransfers = await Transfer.countDocuments({
    ...transferQuery,
    createdAt: { $gte: todayStart }
  });

  const completedTransfers = await Transfer.countDocuments({
    ...transferQuery,
    status: 'received'
  });

  const pendingTransfers = await Transfer.countDocuments({
    ...transferQuery,
    status: 'pending'
  });

  // Security checks
  const securityScanQuery = {};
  if (req.user.role !== 'super_admin' && req.user.branchId) {
    securityScanQuery.branchId = req.user.branchId;
  }
  const rejectedScans = await SecurityScan.countDocuments({
    ...securityScanQuery,
    result: 'rejected'
  });

  // Branch Stock Aggregation (for all admins)
  const branchStocks = await Product.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$currentBranchId',
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'branches',
        localField: '_id',
        foreignField: '_id',
        as: 'branch'
      }
    },
    { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        branchName: { $ifNull: ['$branch.name', 'Central Main Stock'] },
        branchCode: { $ifNull: ['$branch.code', 'PRN'] },
        count: 1
      }
    }
  ]);

  res.status(200).json(
    new ApiResponse(200, 'Dashboard statistics fetched successfully', {
      totalProducts,
      availableProducts,
      inTransitProducts,
      assignedProducts,
      missingProducts,
      scrappedProducts,
      todayTransfers,
      completedTransfers,
      pendingTransfers,
      rejectedScans,
      branchStocks
    })
  );
});

export const getChartData = asyncHandler(async (req, res) => {
  // Mock data or simple aggregation for charts
  const monthlyTransfers = [
    { name: 'Jan', transfers: 4 },
    { name: 'Feb', transfers: 7 },
    { name: 'Mar', transfers: 12 },
    { name: 'Apr', transfers: 18 },
    { name: 'May', transfers: 25 },
    { name: 'Jun', transfers: 31 },
    { name: 'Jul', transfers: 42 }
  ];

  res.status(200).json(
    new ApiResponse(200, 'Chart data fetched successfully', {
      monthlyTransfers
    })
  );
});
