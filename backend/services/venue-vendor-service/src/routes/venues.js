const express = require('express');
const {
  getVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  checkAvailability,
  createBooking
} = require('../controllers/venueController');

const {
  authenticateToken,
  requireRole,
  optionalAuth,
  requireOwnershipOrAdmin
} = require('../middleware/auth');

const {
  venueValidations,
  bookingValidations,
  handleValidationErrors
} = require('../middleware/validation');

const { createUserRateLimit } = require('../middleware/logging');

const router = express.Router();

// Rate limiting for authenticated users
const userRateLimit = createUserRateLimit(15 * 60 * 1000, 200); // 200 requests per 15 minutes

// Public routes
router.get('/', venueValidations.search, handleValidationErrors, optionalAuth, getVenues);
router.get('/:id', getVenue);

// Protected routes - require authentication
router.use(authenticateToken, userRateLimit);

// Venue availability check
router.get(
  '/:id/availability',
  venueValidations.availability,
  handleValidationErrors,
  checkAvailability
);

// Venue booking creation - Organizer or Admin role
router.post(
  '/:id/book',
  requireRole(['organizer', 'admin']),
  bookingValidations.create,
  handleValidationErrors,
  createBooking
);

// Admin-only routes
router.use(requireRole(['admin']));

// Venue CRUD operations
router.post(
  '/',
  venueValidations.create,
  handleValidationErrors,
  createVenue
);

router.put(
  '/:id',
  venueValidations.update,
  handleValidationErrors,
  requireOwnershipOrAdmin(),
  updateVenue
);

router.delete('/:id', deleteVenue);

module.exports = router;
