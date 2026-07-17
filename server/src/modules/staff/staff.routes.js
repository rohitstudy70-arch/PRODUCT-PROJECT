import { Router } from 'express';
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  assignBranch,
  assignRole,
  generateStaffQR
} from './staff.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { auditTrail } from '../../middleware/auditTrail.js';

const router = Router();

router.use(authenticate);

// List/view staff is allowed for super_admin and branch_admin
router.get('/', authorize('super_admin', 'branch_admin'), getAllStaff);
router.get('/:id', authorize('super_admin', 'branch_admin'), getStaffById);

// Staff management operations - only super_admin can modify staff
router.post('/', authorize('super_admin'), auditTrail('staff', 'create'), createStaff);
router.put('/:id', authorize('super_admin'), auditTrail('staff', 'update'), updateStaff);
router.delete('/:id', authorize('super_admin'), auditTrail('staff', 'delete'), deleteStaff);

router.patch('/:id/assign-branch', authorize('super_admin'), auditTrail('staff', 'assign_branch'), assignBranch);
router.patch('/:id/assign-role', authorize('super_admin'), auditTrail('staff', 'assign_role'), assignRole);

// QR Code generation is strictly restricted to SUPER_ADMIN (Organization Head Office)
router.post('/:id/generate-qr', authorize('super_admin'), auditTrail('staff', 'generate_qr'), generateStaffQR);

export default router;
