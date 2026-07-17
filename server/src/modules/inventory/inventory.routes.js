import { Router } from 'express';
import { getInventory, getStockMovements } from './inventory.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

// View inventory is restricted to roles that can manage inventory or view it
router.get('/', authorize('super_admin', 'branch_admin', 'store_manager'), getInventory);
router.get('/movements', authorize('super_admin', 'branch_admin'), getStockMovements);

export default router;
