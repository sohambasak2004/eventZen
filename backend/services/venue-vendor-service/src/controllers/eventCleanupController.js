const EventVenueBooking = require('../models/EventVenueBooking');
const EventVendor = require('../models/EventVendor');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Clean up all MongoDB data related to a specific event
 * @route DELETE /api/v1/events/:eventId/cleanup
 * @access Private (Admin/Organizer)
 */
const cleanupEventData = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  try {
    // These cleanup records are independent. Avoid Mongo transactions here so
    // deletion also works on standalone Mongo deployments.
    const [bookingDeleteResult, vendorDeleteResult] = await Promise.all([
      EventVenueBooking.deleteMany({ eventId }),
      EventVendor.deleteMany({ eventId })
    ]);

    const deletedCounts = {
      bookings: bookingDeleteResult.deletedCount,
      vendors: vendorDeleteResult.deletedCount
    };

    res.status(200).json({
      success: true,
      message: `Event cleanup completed for eventId: ${eventId}`,
      data: {
        eventId,
        deletedCounts,
        totalDeleted: deletedCounts.bookings + deletedCounts.vendors
      }
    });

  } catch (error) {
    console.error('Event cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup event data',
      error: error.message
    });
  }
});

/**
 * Get all MongoDB data related to a specific event
 * @route GET /api/v1/events/:eventId/related-data
 * @access Private
 */
const getEventRelatedData = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required'
    });
  }

  try {
    // Get all related data
    const [bookings, vendors] = await Promise.all([
      EventVenueBooking.find({ eventId })
        .select('bookingId venueId organizerId booking.status payment.status pricing.totalAmount createdAt')
        .lean(),
      EventVendor.find({ eventId })
        .select('contractId vendorId organizerId contract.status payment.status pricing.totalAmount createdAt')
        .lean()
    ]);

    const summary = {
      eventId,
      totalRelatedRecords: bookings.length + vendors.length,
      bookings: {
        count: bookings.length,
        data: bookings
      },
      vendors: {
        count: vendors.length,
        data: vendors
      }
    };

    res.status(200).json({
      success: true,
      message: `Found ${summary.totalRelatedRecords} related records for eventId: ${eventId}`,
      data: summary
    });

  } catch (error) {
    console.error('Get event related data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event related data',
      error: error.message
    });
  }
});


module.exports = {
  cleanupEventData,
  getEventRelatedData
};
