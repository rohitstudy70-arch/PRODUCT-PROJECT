import { Router } from 'express';
import { login, refreshToken, logout, getProfile, forgotPassword, resetPassword, changePassword } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.put('/change-password', authenticate, changePassword);

export default router;
