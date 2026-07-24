import { Router } from 'express';
import {
  createProductCategory,
  getProductCategories,
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  generateProductQR,
  getProductHistory,
  searchProducts
} from './product.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { auditTrail } from '../../middleware/auditTrail.js';

const router = Router();

router.use(authenticate);

// Category routes
router.post('/categories', authorize('super_admin'), auditTrail('productCategory', 'create'), createProductCategory);
router.get('/categories', getProductCategories);

// Product view is allowed for anyone logged in (restricted by branch internally)
router.get('/search', searchProducts);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/:id/history', getProductHistory);

// Product modifications - super_admin, branch_admin, store_manager
router.post('/', authorize('super_admin', 'branch_admin', 'store_manager'), auditTrail('product', 'create'), createProduct);
router.put('/:id', authorize('super_admin', 'branch_admin', 'store_manager'), auditTrail('product', 'update'), updateProduct);
router.delete('/:id', authorize('super_admin', 'branch_admin'), auditTrail('product', 'delete'), deleteProduct);

// QR Code generation is restricted to SUPER_ADMIN (Organization Head Office)
router.post('/:id/generate-qr', authorize('super_admin'), auditTrail('product', 'generate_qr'), generateProductQR);

export default router;
