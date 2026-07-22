import express from 'express';
import {
  postLocationTelemetry,
  getActiveDutyStaff,
  getDutySessionHistory,
  getTrackingReports
} from './tracking.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

router.use(authenticate);

// Staff sends real-time GPS telemetry
router.post('/ping', postLocationTelemetry);

// View live active staff locations (Super Admin and Branch Admin)
router.get('/active', authorize('super_admin', 'branch_admin'), getActiveDutyStaff);

// View duty session route playback & history
router.get('/history/:dutySessionId', authorize('super_admin', 'branch_admin', 'staff'), getDutySessionHistory);

// View duty and tracking reports
router.get('/reports', authorize('super_admin', 'branch_admin'), getTrackingReports);

export default router;
