import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import authRoutes from './modules/auth/auth.routes.js';
import branchRoutes from './modules/branch/branch.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import productRoutes from './modules/product/product.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import transferRoutes from './modules/transfer/transfer.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import trackingRoutes from './modules/tracking/tracking.routes.js';

import { defaultLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import ApiResponse from './utils/ApiResponse.js';

const app = express();

// Trust proxy for Render/reverse proxy deployments
app.set('trust proxy', 1);

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

// Apply global rate limiter
app.use(defaultLimiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, 'Arshi Enterprise ERP API is running smoothly'));
});

// Route mountings
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/tracking', trackingRoutes);

// 404 Route handler
app.use('*', (req, res, next) => {
  res.status(404).json(new ApiResponse(404, `Endpoint ${req.originalUrl} not found`));
});

// Global error handler
app.use(errorHandler);

export default app;
