const express = require('express');
const {
  cleanupEventData,
  getEventRelatedData
} = require('../controllers/eventCleanupController');

const {
  authenticateToken
} = require('../middleware/auth');

const { createUserRateLimit } = require('../middleware/logging');

const router = express.Router();

// Rate limiting
const userRateLimit = createUserRateLimit(15 * 60 * 1000, 50);

// All routes require authentication
router.use(authenticateToken, userRateLimit);


/**
 * DELETE /api/v1/events/:eventId/cleanup
 * Clean up all MongoDB data related to a specific event
 * Removes:
 * - Event venue bookings
 * - Event vendor contracts
 * - Any other event-related data
 */
router.delete('/:eventId/cleanup', cleanupEventData);

/**
 * GET /api/v1/events/:eventId/related-data
 * Get all MongoDB data related to a specific event (for verification)
 */
router.get('/:eventId/related-data', getEventRelatedData);

module.exports = router;
