import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getSecurityScans, sendGateOTP, verifyGateOTP } from './security.controller.js';

const router = Router();

router.use(authenticate);

router.get('/scans', getSecurityScans);
router.post('/send-otp', sendGateOTP);
router.post('/verify-otp', verifyGateOTP);

export default router;
