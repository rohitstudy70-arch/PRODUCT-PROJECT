import Transfer from './transfer.model.js';
import TransferItem from './transferItem.model.js';
import Product from '../product/product.model.js';
import ProductHistory from '../product/productHistory.model.js';
import Inventory from '../inventory/inventory.model.js';
import StockMovement from '../inventory/stockMovement.model.js';
import Staff from '../staff/staff.model.js';
import QRCode from '../qr/qrCode.model.js';
import SecurityScan from '../security/securityScan.model.js';
import Notification from '../notification/notification.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getNextSequence, generatePaginationMeta } from '../../utils/helpers.js';

// --- CREATE TRANSFER ---
export const createTransfer = asyncHandler(async (req, res) => {
  const { fromBranchId, toBranchId, assignedStaffId, productIds, notes } = req.body;

  if (!fromBranchId || !toBranchId || !assignedStaffId || !productIds || productIds.length === 0) {
    throw new ApiError(400, 'From branch, to branch, assigned staff, and list of products are required');
  }

  // Generate TRF000001 format ID
  const transferId = await getNextSequence('transfer', 'TRF', 6);

  const transfer = await Transfer.create({
    organizationId: req.user.organizationId,
    transferId,
    fromBranchId,
    toBranchId,
    assignedStaffId,
    status: 'pending',
    notes,
    requestedBy: req.user._id,
    createdBy: req.user._id,
    totalItems: productIds.length
  });

  // Create TransferItems
  const itemsData = productIds.map(productId => ({
    transferId: transfer._id,
    productId,
    status: 'pending'
  }));
  await TransferItem.insertMany(itemsData);

  // Update product statuses to reserved/assigned
  await Product.updateMany(
    { _id: { $in: productIds } },
    { status: 'assigned' }
  );

  await Inventory.updateMany(
    { productId: { $in: productIds } },
    { status: 'reserved' }
  );

  // Send Notification to Organization
  await Notification.create({
    organizationId: req.user.organizationId,
    userId: req.user._id,
    type: 'transfer_created',
    title: 'New Transfer Created',
    message: `Transfer ${transferId} has been created and is pending approval.`,
    link: `/transfers/${transfer._id}`
  });

  res.status(201).json(new ApiResponse(201, 'Transfer created successfully', transfer));
});

// --- APPROVE TRANSFER ---
export const approveTransfer = asyncHandler(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id);
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  if (transfer.status !== 'pending') {
    throw new ApiError(400, 'Only pending transfers can be approved');
  }

  transfer.status = 'approved';
  transfer.approvedBy = req.user._id;
  transfer.approvedAt = new Date();
  await transfer.save();

  // Notify assigned staff member
  if (transfer.assignedStaffId) {
    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.assignedStaffId,
      type: 'transfer_approved',
      title: 'Transfer Assigned to You',
      message: `You have been assigned to carry out Transfer ${transfer.transferId}.`,
      link: `/transfers/${transfer._id}`
    });
  }

  res.status(200).json(new ApiResponse(200, 'Transfer approved successfully', transfer));
});

// --- LIST TRANSFERS ---
export const getTransfers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {};
  if (status) query.status = status;

  // Branch isolation
  if (req.user.role !== 'super_admin' && req.user.branchId) {
    query.$or = [
      { fromBranchId: req.user.branchId },
      { toBranchId: req.user.branchId }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Transfer.countDocuments(query);
  const transfers = await Transfer.find(query)
    .populate('fromBranchId', 'name code')
    .populate('toBranchId', 'name code')
    .populate('assignedStaffId', 'firstName lastName employeeId')
    .populate('requestedBy', 'firstName lastName')
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      'Transfers retrieved successfully',
      transfers,
      generatePaginationMeta(page, limit, total)
    )
  );
});

// --- TRANSFER DETAIL ---
export const getTransferById = asyncHandler(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id)
    .populate('fromBranchId', 'name code address')
    .populate('toBranchId', 'name code address')
    .populate('assignedStaffId', 'firstName lastName employeeId qrCode')
    .populate('requestedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .populate('receivedBy', 'firstName lastName');

  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  const items = await TransferItem.find({ transferId: transfer._id })
    .populate('productId', 'name productId serialNumber imei model qrCode');

  const transferObj = transfer.toObject();
  transferObj.items = items;

  res.status(200).json(new ApiResponse(200, 'Transfer retrieved successfully', transferObj));
});

// --- STORE ROOM SCAN (DISPATCH PREPARATIONS) ---
export const scanItemForDispatch = asyncHandler(async (req, res) => {
  const { transferId, productQrCode } = req.body;

  if (!transferId || !productQrCode) {
    throw new ApiError(400, 'Transfer ID and scanned product QR/serial are required');
  }

  const transfer = await Transfer.findById(transferId);
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  if (!['approved', 'preparing'].includes(transfer.status)) {
    throw new ApiError(400, `Cannot prepare dispatch. Current status is ${transfer.status}`);
  }

  // Find product by QR UUID code, Serial Number, or Product ID
  const product = await Product.findOne({
    $or: [
      { qrCode: productQrCode },
      { serialNumber: productQrCode },
      { productId: productQrCode }
    ]
  });

  if (!product) {
    throw new ApiError(404, 'Product not registered in ERP');
  }

  // Find if this product belongs to the transfer
  const transferItem = await TransferItem.findOne({
    transferId: transfer._id,
    productId: product._id
  });

  if (!transferItem) {
    throw new ApiError(400, `Scanned product ${product.productId} is not part of this transfer manifest`);
  }

  if (transferItem.status === 'scanned') {
    return res.status(200).json(new ApiResponse(200, 'Product already scanned', transferItem));
  }

  transferItem.status = 'scanned';
  await transferItem.save();

  // If transfer was 'approved', update to 'preparing'
  if (transfer.status === 'approved') {
    transfer.status = 'preparing';
    await transfer.save();
  }

  // Check if all items are scanned
  const unscannedCount = await TransferItem.countDocuments({
    transferId: transfer._id,
    status: 'pending'
  });

  if (unscannedCount === 0) {
    transfer.status = 'ready_for_dispatch';
    await transfer.save();

    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.createdBy,
      type: 'dispatch_started',
      title: 'Transfer Ready for Dispatch',
      message: `All items for Transfer ${transfer.transferId} have been successfully scanned and packed.`,
      link: `/transfers/${transfer._id}`
    });
  }

  res.status(200).json(new ApiResponse(200, 'Product scanned successfully', {
    transferItem,
    readyForDispatch: unscannedCount === 0
  }));
});

// --- SECURITY GATE EXIT WORKFLOW (CHECOUT SCAN) ---
export const gateExitVerification = asyncHandler(async (req, res) => {
  const { transferId, staffQrCode, scannedProductQrs, gateNumber, notes } = req.body;

  if (!transferId || !staffQrCode || !scannedProductQrs) {
    throw new ApiError(400, 'Transfer ID, Staff QR, and scanned Product QRs are required');
  }

  const transfer = await Transfer.findById(transferId);
  if (!transfer) throw new ApiError(404, 'Transfer not found');

  if (transfer.status !== 'ready_for_dispatch') {
    throw new ApiError(400, 'Transfer is not ready for gate dispatch');
  }

  // Step 1: Scan & Verify Staff QR
  const staff = await Staff.findOne({ qrCode: staffQrCode });
  const isStaffValid = staff && staff._id.equals(transfer.assignedStaffId);

  if (!isStaffValid) {
    // Generate Security Exit Rejected record
    await SecurityScan.create({
      organizationId: transfer.organizationId,
      transferId: transfer._id,
      type: 'exit',
      branchId: transfer.fromBranchId,
      gateNumber,
      securityGuardId: req.user._id,
      staffQR: { scanned: true, valid: false },
      result: 'rejected',
      notes: 'Exit rejected: Assigned staff QR code invalid or mismatched.'
    });

    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.requestedBy,
      type: 'security_alert',
      title: 'Gate Security Breach Alert',
      message: `Security check rejected at Gate ${gateNumber} for Transfer ${transfer.transferId}. Invalid staff QR scan.`,
      link: `/transfers/${transfer._id}`
    });

    throw new ApiError(400, 'Security exit scan rejected: Staff QR mismatch');
  }

  // Step 2: Verify Product QR Codes
  const manifestItems = await TransferItem.find({ transferId: transfer._id });
  const manifestProductIds = manifestItems.map(item => item.productId.toString());

  // Find scanned products in Database
  const scannedProducts = await Product.find({
    $or: [
      { qrCode: { $in: scannedProductQrs } },
      { serialNumber: { $in: scannedProductQrs } },
      { productId: { $in: scannedProductQrs } }
    ]
  });

  const scannedProductIds = scannedProducts.map(p => p._id.toString());

  // Mismatch Detection
  const missingProductIds = manifestProductIds.filter(id => !scannedProductIds.includes(id));
  const extraProductIds = scannedProductIds.filter(id => !manifestProductIds.includes(id));

  const hasMismatches = missingProductIds.length > 0 || extraProductIds.length > 0;

  if (hasMismatches) {
    // Save rejected scan
    await SecurityScan.create({
      organizationId: transfer.organizationId,
      transferId: transfer._id,
      type: 'exit',
      branchId: transfer.fromBranchId,
      gateNumber,
      securityGuardId: req.user._id,
      staffQR: { scanned: true, valid: true, staffId: staff._id },
      result: 'rejected',
      mismatches: { missing: missingProductIds, extra: extraProductIds },
      notes: `Exit rejected. Missing items count: ${missingProductIds.length}, Extra items count: ${extraProductIds.length}.`
    });

    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.requestedBy,
      type: 'mismatch_detected',
      title: 'Gate Scan Mismatch Alert',
      message: `Security check rejected for Transfer ${transfer.transferId} due to item manifest mismatch.`,
      link: `/transfers/${transfer._id}`
    });

    throw new ApiError(400, 'Security check rejected: Products scanned do not match transfer manifest exactly', {
      missing: missingProductIds,
      extra: extraProductIds
    });
  }

  // Everything matches! Approve dispatch.
  // Save Security Exit Approved Log
  await SecurityScan.create({
    organizationId: transfer.organizationId,
    transferId: transfer._id,
    type: 'exit',
    branchId: transfer.fromBranchId,
    gateNumber,
    securityGuardId: req.user._id,
    staffQR: { scanned: true, valid: true, staffId: staff._id },
    result: 'approved',
    notes
  });

  // Update Transfer status
  transfer.status = 'in_transit';
  transfer.dispatchedAt = new Date();
  await transfer.save();

  // Update Products & Inventory status
  await Product.updateMany(
    { _id: { $in: manifestProductIds } },
    { status: 'in_transit', currentHolderId: staff._id }
  );

  await Inventory.updateMany(
    { productId: { $in: manifestProductIds } },
    { status: 'in_transit', assignedTo: staff._id }
  );

  // Write Product History
  for (const productId of manifestProductIds) {
    await ProductHistory.create({
      productId,
      action: 'dispatched',
      fromBranchId: transfer.fromBranchId,
      toBranchId: transfer.toBranchId,
      transferId: transfer._id,
      staffId: staff._id,
      securityGuardId: req.user._id,
      gateNumber,
      notes: 'Cleared gate exit security check. Dispatched in transit.'
    });
  }

  res.status(200).json(new ApiResponse(200, 'Security exit cleared successfully. Goods are now In Transit.', transfer));
});

// --- GATE ENTRY AND ARRIVAL RECEIVE WORKFLOW ---
export const gateEntryReceive = asyncHandler(async (req, res) => {
  const { transferId, staffQrCode, scannedProductQrs, gateNumber, notes } = req.body;

  if (!transferId || !staffQrCode || !scannedProductQrs) {
    throw new ApiError(400, 'Transfer ID, Staff QR, and scanned Product QRs are required');
  }

  const transfer = await Transfer.findById(transferId);
  if (!transfer) throw new ApiError(404, 'Transfer not found');

  if (transfer.status !== 'in_transit') {
    throw new ApiError(400, 'Transfer status is not In Transit');
  }

  // Step 1: Scan & Verify Staff QR
  const staff = await Staff.findOne({ qrCode: staffQrCode });
  const isStaffValid = staff && staff._id.equals(transfer.assignedStaffId);

  if (!isStaffValid) {
    await SecurityScan.create({
      organizationId: transfer.organizationId,
      transferId: transfer._id,
      type: 'entry',
      branchId: transfer.toBranchId,
      gateNumber,
      securityGuardId: req.user._id,
      staffQR: { scanned: true, valid: false },
      result: 'rejected',
      notes: 'Entry rejected: Assigned staff QR invalid.'
    });
    throw new ApiError(400, 'Security entry scan rejected: Staff QR mismatch');
  }

  // Step 2: Verify Product QR Codes
  const manifestItems = await TransferItem.find({ transferId: transfer._id });
  const manifestProductIds = manifestItems.map(item => item.productId.toString());

  const scannedProducts = await Product.find({
    $or: [
      { qrCode: { $in: scannedProductQrs } },
      { serialNumber: { $in: scannedProductQrs } },
      { productId: { $in: scannedProductQrs } }
    ]
  });

  const scannedProductIds = scannedProducts.map(p => p._id.toString());

  const missingProductIds = manifestProductIds.filter(id => !scannedProductIds.includes(id));
  const extraProductIds = scannedProductIds.filter(id => !manifestProductIds.includes(id));

  // If there's an extra product: Block Receive completely
  if (extraProductIds.length > 0) {
    await SecurityScan.create({
      organizationId: transfer.organizationId,
      transferId: transfer._id,
      type: 'entry',
      branchId: transfer.toBranchId,
      gateNumber,
      securityGuardId: req.user._id,
      staffQR: { scanned: true, valid: true, staffId: staff._id },
      result: 'rejected',
      mismatches: { extra: extraProductIds },
      notes: 'Blocked arrival scan: Extra product detected at gate.'
    });
    throw new ApiError(400, 'Block Receive: Extra product scanned that is not in the manifest');
  }

  // If there are missing products: Accept with alert & notify organization
  const isPerfectMatch = missingProductIds.length === 0;

  // Log entry scan
  await SecurityScan.create({
    organizationId: transfer.organizationId,
    transferId: transfer._id,
    type: 'entry',
    branchId: transfer.toBranchId,
    gateNumber,
    securityGuardId: req.user._id,
    staffQR: { scanned: true, valid: true, staffId: staff._id },
    result: isPerfectMatch ? 'approved' : 'approved', // Accept but register discrepancies
    mismatches: { missing: missingProductIds },
    notes: isPerfectMatch ? 'Perfect verification entry' : 'Received with missing items'
  });

  // Complete Transfer Update
  transfer.status = isPerfectMatch ? 'received' : 'arrived'; // arrived = partial receipt
  transfer.receivedAt = new Date();
  transfer.arrivedAt = new Date();
  transfer.receivedBy = req.user._id;
  await transfer.save();

  // Shift inventory to destination branch
  for (const item of manifestItems) {
    const isMissing = missingProductIds.includes(item.productId.toString());

    if (isMissing) {
      item.status = 'missing';
      await item.save();

      // Update product status to missing
      await Product.findByIdAndUpdate(item.productId, {
        status: 'missing',
        currentHolderId: null
      });

      await Inventory.findOneAndUpdate(
        { productId: item.productId },
        { status: 'available', branchId: transfer.fromBranchId, assignedTo: null } // stays listed under source or marked missing
      );

      // Write Product History
      await ProductHistory.create({
        productId: item.productId,
        action: 'missing',
        fromBranchId: transfer.fromBranchId,
        transferId: transfer._id,
        staffId: staff._id,
        securityGuardId: req.user._id,
        notes: 'Declared missing during entry gate verification.'
      });

    } else {
      item.status = 'received';
      await item.save();

      // Update product destination branch and holder
      await Product.findByIdAndUpdate(item.productId, {
        status: 'available',
        currentBranchId: transfer.toBranchId,
        currentHolderId: null
      });

      // Shift stock record
      await Inventory.findOneAndUpdate(
        { productId: item.productId },
        { status: 'available', branchId: transfer.toBranchId, assignedTo: null, updatedBy: req.user._id }
      );

      // Write History
      await ProductHistory.create({
        productId: item.productId,
        action: 'received',
        fromBranchId: transfer.fromBranchId,
        toBranchId: transfer.toBranchId,
        transferId: transfer._id,
        staffId: staff._id,
        securityGuardId: req.user._id,
        notes: 'Received at destination branch.'
      });

      // Write stock movements log
      await StockMovement.create({
        productId: item.productId,
        fromBranchId: transfer.fromBranchId,
        toBranchId: transfer.toBranchId,
        type: 'transfer_in',
        transferId: transfer._id,
        performedBy: req.user._id,
        notes: 'Inbound transfer receipt'
      });
    }
  }

  // Notifications
  if (!isPerfectMatch) {
    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.requestedBy,
      type: 'mismatch_detected',
      title: 'Discrepancy: Missing Products Received',
      message: `Transfer ${transfer.transferId} was received with missing items at destination.`,
      link: `/transfers/${transfer._id}`
    });
  } else {
    await Notification.create({
      organizationId: transfer.organizationId,
      userId: transfer.requestedBy,
      type: 'goods_received',
      title: 'Transfer Completed',
      message: `All items for Transfer ${transfer.transferId} were received successfully.`,
      link: `/transfers/${transfer._id}`
    });
  }

  res.status(200).json(new ApiResponse(200, 'Arrival gate verify processed successfully', {
    transfer,
    isPerfectMatch,
    missingItemsCount: missingProductIds.length
  }));
});

// --- FETCH ACTIVE MANIFEST BY STAFF QR/ID ---
export const getActiveTransferByStaff = asyncHandler(async (req, res) => {
  const { staffQrCode } = req.params;
  const { type = 'exit' } = req.query; // 'exit' or 'entry'

  if (!staffQrCode) {
    throw new ApiError(400, 'Staff QR Code or Employee ID is required');
  }

  // Find staff member
  const staff = await Staff.findOne({
    $or: [{ qrCode: staffQrCode }, { employeeId: staffQrCode }]
  });

  if (!staff) {
    throw new ApiError(404, 'Staff member not registered or QR card invalid');
  }

  // Construct query based on flow type
  const query = {
    assignedStaffId: staff._id
  };

  if (type === 'exit') {
    query.status = { $in: ['approved', 'preparing', 'ready_for_dispatch'] };
  } else {
    query.status = 'in_transit';
  }

  // Search active transfer
  const transfer = await Transfer.findOne(query)
    .populate('fromBranchId', 'name code address')
    .populate('toBranchId', 'name code address')
    .populate('assignedStaffId', 'firstName lastName employeeId qrCode')
    .populate('requestedBy', 'firstName lastName');

  if (!transfer) {
    throw new ApiError(404, `No active transfer manifest found for driver ${staff.firstName} ${staff.lastName}`);
  }

  // Populate manifest items
  const items = await TransferItem.find({ transferId: transfer._id })
    .populate('productId', 'name productId serialNumber imei model qrCode');

  const transferObj = transfer.toObject();
  transferObj.items = items;

  res.status(200).json(
    new ApiResponse(200, 'Active manifest retrieved successfully', {
      transfer: transferObj,
      staff
    })
  );
});

// --- CONFIRM ARRIVAL (DITTO FROM MOCKUP LOGIC) ---
export const confirmArrivalByStaff = asyncHandler(async (req, res) => {
  const { staffQrCode, toBranchId } = req.body;

  if (!staffQrCode || !toBranchId) {
    throw new ApiError(400, 'Staff QR/ID and destination branch ID are required');
  }

  // Find staff member
  const staff = await Staff.findOne({
    $or: [{ qrCode: staffQrCode }, { employeeId: staffQrCode }]
  });

  if (!staff) {
    throw new ApiError(404, 'Staff member not registered or QR card invalid');
  }

  // Search active transfer
  const transfer = await Transfer.findOne({
    assignedStaffId: staff._id,
    toBranchId,
    status: 'in_transit'
  });

  if (!transfer) {
    throw new ApiError(404, `No incoming in-transit transfers found for driver ${staff.firstName} ${staff.lastName} at this branch`);
  }

  // Update status
  transfer.status = 'received';
  transfer.arrivedAt = new Date();
  transfer.receivedAt = new Date();
  transfer.receivedBy = req.user._id;
  await transfer.save();

  // Find manifest items
  const manifestItems = await TransferItem.find({ transferId: transfer._id });
  const manifestProductIds = manifestItems.map(item => item.productId);

  // Update items status
  await TransferItem.updateMany(
    { transferId: transfer._id },
    { status: 'received' }
  );

  // Update products status and location
  await Product.updateMany(
    { _id: { $in: manifestProductIds } },
    {
      status: 'available',
      currentBranchId: transfer.toBranchId,
      currentHolderId: null
    }
  );

  // Update inventory record
  await Inventory.updateMany(
    { productId: { $in: manifestProductIds } },
    {
      status: 'available',
      branchId: transfer.toBranchId,
      assignedTo: null,
      updatedBy: req.user._id
    }
  );

  // Write History logs
  for (const productId of manifestProductIds) {
    await ProductHistory.create({
      productId,
      action: 'received',
      fromBranchId: transfer.fromBranchId,
      toBranchId: transfer.toBranchId,
      transferId: transfer._id,
      staffId: staff._id,
      securityGuardId: req.user._id,
      notes: 'Confirmed arrival and received at destination branch.'
    });

    await StockMovement.create({
      productId,
      fromBranchId: transfer.fromBranchId,
      toBranchId: transfer.toBranchId,
      type: 'transfer_in',
      transferId: transfer._id,
      performedBy: req.user._id,
      notes: 'Inbound transfer receipt'
    });
  }

  res.status(200).json(
    new ApiResponse(200, `Branch arrival confirmed: Manifest ${transfer.transferId} received successfully`, transfer)
  );
});
