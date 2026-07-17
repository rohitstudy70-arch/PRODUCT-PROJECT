import { Router } from 'express';
import { getDashboardStats, getChartData } from './dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/charts', getChartData);

export default router;
