const express = require('express');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByOrganizer,
  getUpcomingEvents,
  searchEvents,
  updateAttendeeCount,
  getEventStats
} = require('../controllers/eventController');

const {
  authenticateToken,
  requireRole,
  optionalAuth
} = require('../middleware/auth');

const {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventQueryValidation,
  handleValidationErrors
} = require('../middleware/validation');

const { createUserRateLimit } = require('../middleware/logging');

const router = express.Router();

// Rate limiting
const userRateLimit = createUserRateLimit(15 * 60 * 1000, 200); // 200 requests per 15 minutes

/**
 * Public routes (no authentication required)
 */

// Get upcoming events (public)
router.get('/upcoming', getUpcomingEvents);

// Search events (public)
router.get('/search', searchEvents);

// Event statistics (admin only)
router.get('/admin/stats', authenticateToken, userRateLimit, requireRole(['admin']), getEventStats);

// Organizer events (must come before /:id)
router.get(
  '/organizer/:organizerId',
  authenticateToken,
  userRateLimit,
  getEventsByOrganizer
);

// Get all events (public events visible, private events require auth)
router.get('/', eventQueryValidation, handleValidationErrors, optionalAuth, getEvents);

// Get single event (public events visible, private events require auth)
router.get('/:id', eventIdValidation, handleValidationErrors, optionalAuth, getEvent);

/**
 * Protected routes (authentication required)
 */

// Apply authentication and rate limiting to all routes below
router.use(authenticateToken, userRateLimit);

// Event CRUD operations
router.post('/', createEventValidation, handleValidationErrors, createEvent);
router.put('/:id', eventIdValidation, updateEventValidation, handleValidationErrors, updateEvent);
router.delete('/:id', eventIdValidation, handleValidationErrors, deleteEvent);

// Attendee management
router.patch('/:id/attendees', eventIdValidation, handleValidationErrors, updateAttendeeCount);

module.exports = router;
