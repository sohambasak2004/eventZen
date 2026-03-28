const { Venue, EventVenueBooking } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const normalizeVenueImages = (images = []) =>
  images
    .filter((image) => image && typeof image.url === 'string' && image.url.trim())
    .map((image, index) => ({
      url: image.url.trim(),
      alt: typeof image.alt === 'string' ? image.alt.trim() : '',
      isPrimary: index === 0
    }));

const normalizeVenueStatus = (venueData = {}) => {
  let isActive;

  if (typeof venueData.status === 'string') {
    const normalizedStatus = venueData.status.trim().toLowerCase();

    if (normalizedStatus === 'available') {
      isActive = true;
    } else if (normalizedStatus === 'unavailable') {
      isActive = false;
    }
  }

  if (typeof venueData.isActive === 'boolean') {
    isActive = venueData.isActive;
  }

  if (typeof venueData.availability?.isActive === 'boolean') {
    isActive = venueData.availability.isActive;
  }

  if (typeof isActive !== 'boolean') {
    return {};
  }

  return {
    isActive,
    availability: {
      ...(venueData.availability || {}),
      isActive
    }
  };
};

const normalizeVenuePayload = (venueData = {}) => {
  const normalized = {
    ...venueData,
    description: emptyToUndefined(venueData.description)
  };

  if (venueData.contactInfo) {
    const email = emptyToUndefined(venueData.contactInfo.email);
    const phone = emptyToUndefined(venueData.contactInfo.phone);
    const website = emptyToUndefined(venueData.contactInfo.website);

    normalized.contactInfo =
      email || phone || website
        ? { ...(email && { email }), ...(phone && { phone }), ...(website && { website }) }
        : undefined;
  }

  if (Array.isArray(venueData.images)) {
    normalized.images = normalizeVenueImages(venueData.images);
  }

  return {
    ...normalized,
    ...normalizeVenueStatus(venueData)
  };
};

class VenueService {
  /**
   * Create a new venue
   */
  async createVenue(venueData, createdBy) {
    try {
      const normalizedVenueData = normalizeVenuePayload(venueData);

      const venue = new Venue({
        ...normalizedVenueData,
        createdBy
      });

      return await venue.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Venue with this ID already exists', 409);
      }
      throw error;
    }
  }

  /**
   * Get all venues with filtering and pagination
   */
  async getVenues(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      availableOnly,
      city,
      capacity,
      maxPrice,
      search
    } = { ...filters, ...pagination };

    // Build query
    const query = {};

    if (availableOnly === 'true' || availableOnly === true) {
      query['availability.isActive'] = true;
    }

    // City filter
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    // Capacity filter
    if (capacity) {
      query.capacity = { $gte: parseInt(capacity) };
    }

    // Price filter
    if (maxPrice) {
      query.pricePerDay = { $lte: parseFloat(maxPrice) };
    }

    // Text search
    if (search) {
      query.$or = [
        { venueName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [venues, total] = await Promise.all([
      Venue.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Venue.countDocuments(query)
    ]);

    return {
      venues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get venue by ID (supports both venueId and MongoDB _id)
   */
  async getVenueById(id) {
    // Try to find by venueId first (custom field)
    let venue = await Venue.findOne({ venueId: id });

    // If not found, try by MongoDB _id
    if (!venue && mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findOne({ _id: id });
    }

    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    return venue;
  }

  /**
   * Update venue (supports both venueId and MongoDB _id)
   */
  async updateVenue(id, updateData, updatedBy) {
    // Try to find by venueId first (custom field)
    let venue = await Venue.findOne({ venueId: id });

    // If not found, try by MongoDB _id
    if (!venue && mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findOne({ _id: id });
    }

    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    // Check ownership or admin role (this should be handled by middleware)
    if (venue.createdBy !== updatedBy) {
      // This check will be enhanced by the requireOwnershipOrAdmin middleware
    }

    const normalizedUpdateData = normalizeVenuePayload(updateData);

    Object.assign(venue, normalizedUpdateData);
    return await venue.save();
  }

  /**
   * Hard delete venue (supports both venueId and MongoDB _id)
   * Completely removes the venue from the database
   */
  async deleteVenue(id, deletedBy) {
    // Try to find by venueId first (custom field)
    let venue = await Venue.findOne({ venueId: id });

    // If not found, try by MongoDB _id
    if (!venue && mongoose.Types.ObjectId.isValid(id)) {
      venue = await Venue.findOne({ _id: id });
    }

    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    // Use the venue's venueId for checking bookings (always use the venueId field)
    const venueIdForBookings = venue.venueId;

    // Check for active bookings
    const activeBookings = await EventVenueBooking.find({
      venueId: venueIdForBookings,
      'booking.status': { $in: ['confirmed', 'in_progress'] },
      'bookingDates.endDate': { $gte: new Date() }
    });

    if (activeBookings.length > 0) {
      throw new AppError('Cannot delete venue with active bookings', 400);
    }

    // HARD DELETE: Completely remove from database
    await Venue.deleteOne({ _id: venue._id });

    // Also clean up any past bookings associated with this venue
    await EventVenueBooking.deleteMany({ venueId: venueIdForBookings });

    return { deleted: true, venueId: venueIdForBookings };
  }

  /**
   * Check venue availability
   */
  async checkAvailability(venueId, startDate, endDate) {
    const venue = await this.getVenueById(venueId);

    // Check venue's own availability settings
    if (!venue.checkAvailability(startDate, endDate)) {
      return {
        available: false,
        reason: 'Venue is not available for the requested dates (blackout period or inactive)',
        conflicts: []
      };
    }

    // Check for booking conflicts
    const conflicts = await EventVenueBooking.findConflictingBookings(
      venueId,
      new Date(startDate),
      new Date(endDate)
    );

    if (conflicts.length > 0) {
      return {
        available: false,
        reason: 'Venue has conflicting bookings for the requested dates',
        conflicts: conflicts.map(booking => ({
          bookingId: booking.bookingId,
          eventId: booking.eventId,
          startDate: booking.bookingDates.setupStartTime,
          endDate: booking.bookingDates.cleanupEndTime,
          status: booking.booking.status
        }))
      };
    }

    return {
      available: true,
      venue: venue,
      suggestedPricing: {
        basePrice: venue.pricePerDay,
        estimatedTotal: this.calculateBookingPrice(venue, startDate, endDate)
      }
    };
  }

  /**
   * Create venue booking
   */
  async createBooking(venueId, bookingData, organizerId) {
    const venue = await this.getVenueById(venueId);

    // Check availability
    const availability = await this.checkAvailability(
      venueId,
      bookingData.bookingDates.startDate,
      bookingData.bookingDates.endDate
    );

    if (!availability.available) {
      throw new AppError(`Booking not available: ${availability.reason}`, 409);
    }

    // Calculate pricing
    const pricing = this.calculateBookingPrice(
      venue,
      bookingData.bookingDates.startDate,
      bookingData.bookingDates.endDate,
      bookingData.attendeeCount?.expected
    );

    // Create booking
    const booking = new EventVenueBooking({
      ...bookingData,
      venueId,
      organizerId,
      createdBy: organizerId,
      pricing: {
        basePrice: pricing.basePrice,
        totalAmount: pricing.totalAmount,
        ...bookingData.pricing
      },
      // Calculate setup and cleanup times
      bookingDates: {
        ...bookingData.bookingDates,
        setupStartTime: this.calculateSetupTime(
          bookingData.bookingDates.eventStartTime,
          2
        ),
        cleanupEndTime: this.calculateCleanupTime(
          bookingData.bookingDates.eventEndTime,
          2
        )
      }
    });

    return await booking.save();
  }

  // Helper methods
  calculateBookingPrice(venue, startDate, endDate, attendeeCount = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    let basePrice = venue.pricePerDay * days;

    // Apply capacity-based pricing adjustments
    if (attendeeCount && attendeeCount > venue.capacity * 0.8) {
      basePrice *= 1.1; // 10% premium for near-capacity events
    }

    return {
      basePrice: venue.pricePerDay,
      days,
      subtotal: basePrice,
      totalAmount: basePrice,
      priceBreakdown: {
        dailyRate: venue.pricePerDay,
        numberOfDays: days,
        capacityPremium: attendeeCount > venue.capacity * 0.8 ? '10%' : '0%'
      }
    };
  }

  calculateSetupTime(eventStartTime, setupHours) {
    const setupTime = new Date(eventStartTime);
    setupTime.setHours(setupTime.getHours() - setupHours);
    return setupTime;
  }

  calculateCleanupTime(eventEndTime, cleanupHours) {
    const cleanupTime = new Date(eventEndTime);
    cleanupTime.setHours(cleanupTime.getHours() + cleanupHours);
    return cleanupTime;
  }
}

module.exports = new VenueService();
