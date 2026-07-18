import { Router } from 'express';
import {
  createTransfer,
  approveTransfer,
  getTransfers,
  getTransferById,
  scanItemForDispatch,
  gateExitVerification,
  gateEntryReceive,
  getActiveTransferByStaff,
  confirmArrivalByStaff
} from './transfer.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { auditTrail } from '../../middleware/auditTrail.js';

const router = Router();

router.use(authenticate);

// View transfers lists
router.get('/', getTransfers);
router.get('/active-by-staff/:staffQrCode', getActiveTransferByStaff);
router.get('/:id', getTransferById);

// Super admin creates and approves transfers
router.post('/', authorize('super_admin', 'branch_admin'), auditTrail('transfer', 'create'), createTransfer);
router.patch('/:id/approve', authorize('super_admin'), auditTrail('transfer', 'approve'), approveTransfer);

// Preparing dispatch (store room scans)
router.post('/dispatch-prepare', authorize('super_admin', 'branch_admin', 'store_manager', 'staff'), scanItemForDispatch);

// Security scan exit gate (check-out)
router.post('/gate-exit', authorize('super_admin', 'branch_admin', 'security_guard'), gateExitVerification);

// Security scan entry gate + receive goods (check-in)
router.post('/gate-entry', authorize('super_admin', 'branch_admin'), gateEntryReceive);

// Simple branch arrival confirmation (ditto mockup)
router.post('/confirm-arrival', authorize('super_admin', 'branch_admin', 'store_manager'), confirmArrivalByStaff);

export default router;
