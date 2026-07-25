import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getSecurityScans } from './security.controller.js';

const router = Router();

router.use(authenticate);

router.get('/scans', getSecurityScans);

export default router;
