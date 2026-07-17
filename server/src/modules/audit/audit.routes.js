import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from './audit.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(authorize('super_admin')); // STRICT Super Admin access only

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
