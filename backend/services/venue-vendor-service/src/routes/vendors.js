const express = require('express');
const {
  getVendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} = require('../controllers/vendorController');

const {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin
} = require('../middleware/auth');

const {
  vendorValidations,
  handleValidationErrors
} = require('../middleware/validation');

const { createUserRateLimit } = require('../middleware/logging');

const router = express.Router();

// Rate limiting for authenticated users
const userRateLimit = createUserRateLimit(15 * 60 * 1000, 200); // 200 requests per 15 minutes

// All vendor routes require authentication
router.use(authenticateToken, userRateLimit);

// Vendor listing
router.get('/', vendorValidations.search, handleValidationErrors, getVendors);
router.get('/:id', getVendor);

// Admin-only routes
router.use(requireRole(['admin']));

// Vendor CRUD operations
router.post(
  '/',
  vendorValidations.create,
  handleValidationErrors,
  createVendor
);

router.put(
  '/:id',
  vendorValidations.update,
  handleValidationErrors,
  requireOwnershipOrAdmin(),
  updateVendor
);

router.delete('/:id', deleteVendor);

module.exports = router;
