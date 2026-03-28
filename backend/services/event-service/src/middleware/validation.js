const { body, param, query, validationResult } = require('express-validator');

const EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Corporate',
  'Conference',
  'Workshop',
  'Networking',
  'Reception',
  'Festival',
  'Other'
];

const EVENT_STATUSES = ['Planned', 'Open', 'Closed', 'Completed', 'Cancelled'];

const timeRule = (field, optional = false) => {
  const rule = body(field);
  if (optional) {
    rule.optional();
  }
  return rule
    .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
    .withMessage(`${field} must be in HH:MM format`);
};

const sharedEventRules = (optional = false) => [
  optional
    ? body('eventType').optional().trim().isIn(EVENT_TYPES).withMessage('Invalid event type')
    : body('eventType').trim().isIn(EVENT_TYPES).withMessage('Invalid event type'),
  optional
    ? body('eventDate')
        .optional()
        .isISO8601()
        .withMessage('Event date must be a valid date')
    : body('eventDate').isISO8601().withMessage('Event date must be a valid date'),
  timeRule('startTime', optional),
  timeRule('endTime', optional),
  optional
    ? body('guestCount')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Number of guests must be at least 1')
    : body('guestCount').isInt({ min: 1 }).withMessage('Number of guests must be at least 1'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a non-negative number'),
  body('ticketPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a non-negative number'),
  body('availableVenueId')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Venue ID must be a string'),
  body('availableVendorId')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Vendor ID must be a string'),
  optional
    ? body('organizerContact.name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Organizer contact name cannot be empty')
    : body('organizerContact.name')
        .trim()
        .notEmpty()
        .withMessage('Organizer contact name is required'),
  optional
    ? body('organizerContact.email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Organizer contact email must be valid')
    : body('organizerContact.email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Organizer contact email must be valid'),
  optional
    ? body('organizerContact.phone')
        .optional()
        .trim()
        .isLength({ min: 5, max: 30 })
        .withMessage('Organizer contact phone must be valid')
    : body('organizerContact.phone')
        .trim()
        .isLength({ min: 5, max: 30 })
        .withMessage('Organizer contact phone is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage('Invalid event status'),
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'invite-only'])
    .withMessage('Invalid event visibility'),
  body().custom((value) => {
    if (value.startTime && value.endTime && value.endTime <= value.startTime) {
      throw new Error('Event end time must be after the start time');
    }
    return true;
  })
];

const createEventValidation = sharedEventRules(false);
const updateEventValidation = sharedEventRules(true);

const eventIdValidation = [
  param('id').trim().notEmpty().withMessage('Event ID is required')
];

const eventQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage('Invalid event status')
];

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: result.array().map((error) => ({
      field: error.path,
      message: error.msg
    })),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  EVENT_TYPES,
  EVENT_STATUSES,
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventQueryValidation,
  handleValidationErrors
};
