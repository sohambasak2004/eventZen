const venueService = require('../services/venueService');
const { catchAsync, AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get all venues
 * @route   GET /api/v1/venues
 * @access  Public
 */
const getVenues = catchAsync(async (req, res, next) => {
  const result = await venueService.getVenues(req.query, req.query);

  res.status(200).json({
    status: 'success',
    data: {
      venues: result.venues,
      pagination: result.pagination
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Get single venue
 * @route   GET /api/v1/venues/:id
 * @access  Public
 */
const getVenue = catchAsync(async (req, res, next) => {
  const venue = await venueService.getVenueById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      venue
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Create venue
 * @route   POST /api/v1/venues
 * @access  Private (Admin only)
 */
const createVenue = catchAsync(async (req, res, next) => {
  const venue = await venueService.createVenue(req.body, req.user.userId);

  res.status(201).json({
    status: 'success',
    data: {
      venue
    },
    message: 'Venue created successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Update venue
 * @route   PUT /api/v1/venues/:id
 * @access  Private (Admin or Owner)
 */
const updateVenue = catchAsync(async (req, res, next) => {
  const venue = await venueService.updateVenue(
    req.params.id,
    req.body,
    req.user.userId
  );

  res.status(200).json({
    status: 'success',
    data: {
      venue
    },
    message: 'Venue updated successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Delete venue
 * @route   DELETE /api/v1/venues/:id
 * @access  Private (Admin only)
 */
const deleteVenue = catchAsync(async (req, res, next) => {
  await venueService.deleteVenue(req.params.id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: null,
    message: 'Venue deleted successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Check venue availability
 * @route   GET /api/v1/venues/:id/availability
 * @access  Private
 */
const checkAvailability = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  const availability = await venueService.checkAvailability(
    req.params.id,
    startDate,
    endDate
  );

  res.status(200).json({
    status: 'success',
    data: {
      availability
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @desc    Create venue booking
 * @route   POST /api/v1/venues/:id/book
 * @access  Private (Organizer)
 */
const createBooking = catchAsync(async (req, res, next) => {
  const booking = await venueService.createBooking(
    req.params.id,
    req.body,
    req.user.userId
  );

  res.status(201).json({
    status: 'success',
    data: {
      booking
    },
    message: 'Venue booking created successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  checkAvailability,
  createBooking
};
