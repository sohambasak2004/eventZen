const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Common validation rules
 */
const commonValidations = {
  // UUID validation
  uuid: (field) => param(field)
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    .withMessage('Invalid UUID format'),

  idOrUuid: (field) => param(field)
    .custom((value) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      const isObjectId = mongoose.Types.ObjectId.isValid(value);

      if (isUuid || isObjectId) {
        return true;
      }

      throw new Error('Invalid venue identifier format');
    }),

  // MongoDB ObjectId validation
  objectId: (field) => param(field)
    .custom((value) => {
      if (mongoose.Types.ObjectId.isValid(value)) {
        return true;
      }
      throw new Error('Invalid ObjectId format');
    }),

  // Email validation
  email: (field) => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  // Phone validation
  phone: (field) => body(field)
    .matches(/^[+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isString()
      .withMessage('Sort field must be a string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Date validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Start date must be in ISO8601 format'),
    query('endDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('End date must be in ISO8601 format')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate <= new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ],

};

/**
 * Venue validation rules
 */
const venueValidations = {
  create: [
    body('venueName')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Venue name must be between 1 and 200 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),

    body('address.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),

    body('address.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),

    body('address.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),

    body('address.zipCode')
      .trim()
      .notEmpty()
      .withMessage('Zip code is required'),

    body('address.country')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Country must be at least 2 characters'),

    body('capacity')
      .isInt({ min: 1 })
      .withMessage('Capacity must be a positive integer'),

    body('pricePerDay')
      .isFloat({ min: 0 })
      .withMessage('Price per day must be a positive number'),

    body('contactInfo.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),

    body('contactInfo.phone')
      .optional()
      .matches(/^[+]?[1-9][\d]{0,15}$/)
      .withMessage('Invalid phone number format'),

    body('images')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Images must be an array with at most 10 items'),

    body('images.*.url')
      .optional()
      .isString()
      .withMessage('Image URL must be a string')
      .custom((value) => {
        const isHttpUrl = /^https?:\/\/\S+$/i.test(value);
        const isImageDataUri = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);

        if (!isHttpUrl && !isImageDataUri) {
          throw new Error('Image must be a valid http(s) URL or base64 image data URI');
        }

        return true;
      }),

    body('images.*.alt')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Image alt text cannot exceed 200 characters')
  ],

  update: [
    commonValidations.idOrUuid('id'),

    body('venueName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Venue name must be between 1 and 200 characters'),

    body('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacity must be a positive integer'),

    body('pricePerDay')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per day must be a positive number'),

    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Status must be a boolean value'),

    body('availability.isActive')
      .optional()
      .isBoolean()
      .withMessage('Availability status must be a boolean value'),

    body('status')
      .optional()
      .isIn(['available', 'unavailable'])
      .withMessage('Status must be either available or unavailable'),

    body('images')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Images must be an array with at most 10 items'),

    body('images.*.url')
      .optional()
      .isString()
      .withMessage('Image URL must be a string')
      .custom((value) => {
        const isHttpUrl = /^https?:\/\/\S+$/i.test(value);
        const isImageDataUri = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);

        if (!isHttpUrl && !isImageDataUri) {
          throw new Error('Image must be a valid http(s) URL or base64 image data URI');
        }

        return true;
      }),

    body('images.*.alt')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Image alt text cannot exceed 200 characters')
  ],

  search: [
    query('city')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('City must be at least 2 characters'),

    query('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacity must be a positive integer'),

    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),

    ...commonValidations.pagination
  ],

  availability: [
    commonValidations.idOrUuid('id'),
    ...commonValidations.dateRange
  ]
};

/**
 * Vendor validation rules
 */
const vendorValidations = {
  create: [
    body('vendorName')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Vendor name must be between 1 and 200 characters'),

    body('businessName')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Business name cannot exceed 200 characters'),

    body('serviceType')
      .isIn([
        'catering', 'photography', 'videography', 'music_dj', 'lighting',
        'decoration', 'security', 'transportation', 'cleaning',
        'equipment_rental', 'entertainment', 'floral', 'planning', 'other'
      ])
      .withMessage('Invalid service type'),

    body('website')
      .optional({ values: 'falsy' })
      .isURL({ require_protocol: true })
      .withMessage('Website must be a valid URL'),

    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Status must be a boolean value')
  ],

  update: [
    commonValidations.uuid('id'),

    body('vendorName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Vendor name must be between 1 and 200 characters'),

    body('serviceType')
      .optional()
      .isIn([
        'catering', 'photography', 'videography', 'music_dj', 'lighting',
        'decoration', 'security', 'transportation', 'cleaning',
        'equipment_rental', 'entertainment', 'floral', 'planning', 'other'
      ])
      .withMessage('Invalid service type'),

    body('website')
      .optional({ values: 'falsy' })
      .isURL({ require_protocol: true })
      .withMessage('Website must be a valid URL'),

    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Status must be a boolean value')
  ],

  search: [
    query('serviceType')
      .optional()
      .isIn([
        'catering', 'photography', 'videography', 'music_dj', 'lighting',
        'decoration', 'security', 'transportation', 'cleaning',
        'equipment_rental', 'entertainment', 'floral', 'planning', 'other'
      ])
      .withMessage('Invalid service type'),

    ...commonValidations.pagination
  ]
};

/**
 * Booking validation rules
 */
const bookingValidations = {
  create: [
    body('eventId')
      .notEmpty()
      .withMessage('Event ID is required'),

    body('venueId')
      .notEmpty()
      .isUUID()
      .withMessage('Valid venue ID is required'),

    body('bookingDates.startDate')
      .isISO8601()
      .toDate()
      .withMessage('Valid start date is required')
      .custom((startDate) => {
        if (startDate <= new Date()) {
          throw new Error('Start date must be in the future');
        }
        return true;
      }),

    body('bookingDates.endDate')
      .isISO8601()
      .toDate()
      .withMessage('Valid end date is required')
      .custom((endDate, { req }) => {
        const startDate = new Date(req.body.bookingDates?.startDate);
        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),

    body('attendeeCount.expected')
      .isInt({ min: 1 })
      .withMessage('Expected attendee count must be a positive integer'),

    body('pricing.basePrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number')
  ],

  updateStatus: [
    commonValidations.uuid('id'),

    body('status')
      .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'in_progress', 'no_show'])
      .withMessage('Invalid booking status'),

    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ]
};

/**
 * Contract validation rules
 */
const contractValidations = {
  create: [
    body('eventId')
      .notEmpty()
      .withMessage('Event ID is required'),

    body('vendorId')
      .notEmpty()
      .isUUID()
      .withMessage('Valid vendor ID is required'),

    body('serviceDetails.serviceType')
      .isIn([
        'catering', 'photography', 'videography', 'music_dj', 'lighting',
        'decoration', 'security', 'transportation', 'cleaning',
        'equipment_rental', 'entertainment', 'floral', 'planning', 'other'
      ])
      .withMessage('Invalid service type'),

    body('serviceDetails.description')
      .trim()
      .notEmpty()
      .withMessage('Service description is required'),

    body('schedule.serviceDate')
      .isISO8601()
      .toDate()
      .withMessage('Valid service date is required')
      .custom((serviceDate) => {
        if (serviceDate <= new Date()) {
          throw new Error('Service date must be in the future');
        }
        return true;
      }),

    body('pricing.agreedPrice')
      .isFloat({ min: 0 })
      .withMessage('Agreed price must be a positive number')
  ],

  updateStatus: [
    commonValidations.uuid('id'),

    body('status')
      .isIn([
        'draft', 'sent', 'under_review', 'negotiating', 'approved',
        'signed', 'active', 'completed', 'cancelled', 'terminated'
      ])
      .withMessage('Invalid contract status'),

    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ]
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errorMessages,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  commonValidations,
  venueValidations,
  vendorValidations,
  bookingValidations,
  contractValidations,
  handleValidationErrors
};
