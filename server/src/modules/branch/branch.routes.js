import { Router } from 'express';
import { createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch } from './branch.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { auditTrail } from '../../middleware/auditTrail.js';

const router = Router();

router.use(authenticate);

// View branches is allowed for super_admin and branch_admin
router.get('/', authorize('super_admin', 'branch_admin'), getAllBranches);
router.get('/:id', authorize('super_admin', 'branch_admin'), getBranchById);

// Modification of branches is strictly SUPER_ADMIN
router.post('/', authorize('super_admin'), auditTrail('branch', 'create'), createBranch);
router.put('/:id', authorize('super_admin'), auditTrail('branch', 'update'), updateBranch);
router.delete('/:id', authorize('super_admin'), auditTrail('branch', 'delete'), deleteBranch);

export default router;
