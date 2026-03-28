const { Event } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const config = require('../config');
const {
  getVenueById,
  getVendorById,
  cleanupVenueVendorEventData,
  cleanupBookingEventData
} = require('../services/venueVendorService');

const userHasRole = (user, roleName) =>
  Array.isArray(user?.roles) &&
  user.roles.some((role) => String(role).toLowerCase() === String(roleName).toLowerCase());

const formatCleanupFailure = (serviceName, error) => ({
  service: serviceName,
  message: error?.message || 'Cleanup request failed',
  statusCode: error?.statusCode || 500
});

const getVenuePrimaryImage = (venue) =>
  venue?.primaryImage?.url ||
  venue?.images?.[0]?.url ||
  '';

const getVenuePrimaryImageAlt = (venue) =>
  venue?.primaryImage?.alt ||
  venue?.images?.[0]?.alt ||
  venue?.venueName ||
  'Venue image';

const enrichEventWithVenueImage = async (event, venueCache) => {
  const normalizedEvent = event?.toJSON ? event.toJSON() : { ...event };
  const venueId = normalizedEvent.availableVenue?.id || normalizedEvent.availableVenueId;

  if (!venueId) {
    return normalizedEvent;
  }

  const existingImage = normalizedEvent.image || normalizedEvent.availableVenue?.meta?.imageUrl;

  if (existingImage) {
    return {
      ...normalizedEvent,
      image: existingImage
    };
  }

  if (!venueCache.has(venueId)) {
    venueCache.set(
      venueId,
      getVenueById(venueId)
        .then((venue) => ({
          imageUrl: getVenuePrimaryImage(venue),
          imageAlt: getVenuePrimaryImageAlt(venue)
        }))
        .catch(() => ({ imageUrl: '', imageAlt: '' }))
    );
  }

  const venueImage = await venueCache.get(venueId);

  return {
    ...normalizedEvent,
    image: venueImage.imageUrl || normalizedEvent.image || '',
    availableVenue: normalizedEvent.availableVenue
      ? {
          ...normalizedEvent.availableVenue,
          meta: {
            ...(normalizedEvent.availableVenue.meta || {}),
            ...(venueImage.imageUrl
              ? {
                  imageUrl: venueImage.imageUrl,
                  imageAlt: venueImage.imageAlt
                }
              : {})
          }
        }
      : normalizedEvent.availableVenue
  };
};

const enrichEventsWithVenueImages = async (events) => {
  const venueCache = new Map();
  return Promise.all(events.map((event) => enrichEventWithVenueImage(event, venueCache)));
};

const buildVisibilityQuery = (req, visibility) => {
  if (visibility === 'all' && userHasRole(req.user, 'admin')) {
    return {};
  }

  if (visibility === 'private' && req.user) {
    return {
      $or: [
        { visibility: 'private', organizerId: req.user.userId },
        { visibility: 'invite-only', organizerId: req.user.userId }
      ]
    };
  }

  return { visibility: 'public' };
};

const hasOwnProperty = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const canReuseExistingSelection = (existingSelection, requestedId) =>
  Boolean(existingSelection?.id) && String(existingSelection.id) === String(requestedId);

const buildSelectionData = async (payload, authorization, existingEvent = null) => {
  const selection = {};

  if (hasOwnProperty(payload, 'availableVenueId')) {
    if (!payload.availableVenueId) {
      selection.availableVenue = undefined;
    } else {
      const venue = await getVenueById(payload.availableVenueId).catch((error) => {
        throw new AppError(error.message || 'Selected venue could not be loaded', error.statusCode || 400);
      });

      const venueIsUnavailable = !venue || venue.isActive === false || venue.availability?.isActive === false;

      if (venueIsUnavailable && !canReuseExistingSelection(existingEvent?.availableVenue, payload.availableVenueId)) {
        throw new AppError('Selected venue is not currently available', 400);
      }

      selection.availableVenue = {
        id: venue.venueId || venue._id,
        name: venue.venueName,
        meta: {
          city: venue.address?.city || '',
          state: venue.address?.state || '',
          capacity: venue.capacity,
          imageUrl: getVenuePrimaryImage(venue),
          imageAlt: getVenuePrimaryImageAlt(venue)
        }
      };
    }
  } else if (existingEvent) {
    selection.availableVenue = existingEvent.availableVenue;
  }

  if (hasOwnProperty(payload, 'availableVendorId')) {
    if (!payload.availableVendorId) {
      selection.availableVendor = undefined;
    } else {
      const vendor = await getVendorById(payload.availableVendorId, authorization).catch((error) => {
        throw new AppError(error.message || 'Selected vendor could not be loaded', error.statusCode || 400);
      });

      const vendorIsUnavailable = !vendor || vendor.isActive === false;

      if (vendorIsUnavailable && !canReuseExistingSelection(existingEvent?.availableVendor, payload.availableVendorId)) {
        throw new AppError('Selected vendor is not currently available', 400);
      }

      selection.availableVendor = {
        id: vendor.vendorId || vendor._id,
        name: vendor.vendorName,
        meta: {
          serviceType: vendor.serviceType || '',
          businessName: vendor.businessName || ''
        }
      };
    }
  } else if (existingEvent) {
    selection.availableVendor = existingEvent.availableVendor;
  }

  return selection;
};

const mapPayloadToEventDocument = async (payload, req, existingEvent = null) => {
  const selection = await buildSelectionData(payload, req.headers.authorization, existingEvent);

  return {
    eventType: payload.eventType ?? existingEvent?.eventType,
    eventDate: payload.eventDate ?? existingEvent?.eventDate,
    startTime: payload.startTime ?? existingEvent?.startTime,
    endTime: payload.endTime ?? existingEvent?.endTime,
    guestCount: payload.guestCount ?? existingEvent?.guestCount,
    budget: payload.budget ?? existingEvent?.budget ?? 0,
    ticketPrice: payload.ticketPrice ?? existingEvent?.ticketPrice ?? 0,
    availableVenue: selection.availableVenue ?? existingEvent?.availableVenue,
    availableVendor: selection.availableVendor ?? existingEvent?.availableVendor,
    organizerContact: payload.organizerContact || existingEvent?.organizerContact,
    notes: payload.notes ?? existingEvent?.notes ?? '',
    title: payload.title || `${payload.eventType ?? existingEvent?.eventType} Event`,
    category: payload.category || payload.eventType || existingEvent?.eventType,
    date: payload.eventDate ?? existingEvent?.eventDate,
    time: payload.startTime ?? existingEvent?.startTime,
    location:
      selection.availableVenue?.name ||
      payload.location ||
      existingEvent?.availableVenue?.name ||
      existingEvent?.location ||
      'Venue not selected',
    capacity: payload.guestCount ?? existingEvent?.guestCount,
    attendees: payload.attendees ?? existingEvent?.attendees ?? 0,
    description: payload.description ?? payload.notes ?? existingEvent?.notes ?? '',
    status: payload.status ?? existingEvent?.status ?? 'Planned',
    visibility: payload.visibility ?? existingEvent?.visibility ?? 'public'
  };
};

const getEvents = catchAsync(async (req, res) => {
  await Event.syncPastEventStatuses();

  const {
    page = 1,
    limit = config.pagination.defaultPageSize,
    sortBy = 'eventDate',
    sortOrder = 'asc',
    status,
    category,
    organizerId,
    visibility = 'public',
    search,
    startDate,
    endDate,
    includeDeleted = false
  } = req.query;

  const query = { isActive: true };

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (organizerId) {
    query.organizerId = organizerId;
  }

  Object.assign(query, buildVisibilityQuery(req, visibility));

  if (startDate || endDate) {
    query.eventDate = {};
    if (startDate) {
      query.eventDate.$gte = new Date(startDate);
    }
    if (endDate) {
      query.eventDate.$lte = new Date(endDate);
    }
  }

  if (search) {
    query.$text = { $search: search };
  }

  if (includeDeleted && userHasRole(req.user, 'admin')) {
    delete query.isActive;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(parseInt(limit, 10), config.pagination.maxPageSize);
  const skip = (pageNum - 1) * limitNum;
  const sortObj = {
    [sortBy]: sortOrder === 'desc' ? -1 : 1
  };

  const [events, totalCount] = await Promise.all([
    Event.find(query).sort(sortObj).skip(skip).limit(limitNum),
    Event.countDocuments(query)
  ]);
  const enrichedEvents = await enrichEventsWithVenueImages(events);

  res.status(200).json({
    success: true,
    data: {
      events: enrichedEvents,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        pageSize: limitNum,
        hasNextPage: pageNum * limitNum < totalCount,
        hasPrevPage: pageNum > 1
      }
    },
    message: `Found ${events.length} events`,
    timestamp: new Date().toISOString()
  });
});

const getEvent = catchAsync(async (req, res, next) => {
  await Event.syncPastEventStatuses();

  const event = await Event.findOne({ eventId: req.params.id });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  if (event.visibility !== 'public') {
    if (!req.user) {
      return next(new AppError('Authentication required to view this event', 401));
    }

    if (event.organizerId !== req.user.userId && !userHasRole(req.user, 'admin')) {
      return next(new AppError('Not authorized to view this event', 403));
    }
  }

  await event.incrementViews();
  const enrichedEvent = await enrichEventWithVenueImage(event, new Map());

  return res.status(200).json({
    success: true,
    data: { event: enrichedEvent },
    message: 'Event retrieved successfully',
    timestamp: new Date().toISOString()
  });
});

const createEvent = catchAsync(async (req, res) => {
  const mappedPayload = await mapPayloadToEventDocument(req.body, req);
  const event = await Event.create({
    ...mappedPayload,
    organizerId: req.user.userId,
    organizerEmail: req.user.email,
    createdBy: req.user.userId
  });
  const enrichedEvent = await enrichEventWithVenueImage(event, new Map());

  return res.status(201).json({
    success: true,
    data: { event: enrichedEvent },
    message: 'Event created successfully',
    timestamp: new Date().toISOString()
  });
});

const updateEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ eventId: req.params.id });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  if (event.organizerId !== req.user.userId && !userHasRole(req.user, 'admin')) {
    return next(new AppError('Not authorized to update this event', 403));
  }

  const mappedPayload = await mapPayloadToEventDocument(req.body, req, event);
  const updatedEvent = await Event.findOneAndUpdate(
    { eventId: req.params.id },
    {
      ...mappedPayload,
      updatedBy: req.user.userId
    },
    {
      new: true,
      runValidators: true
    }
  );
  const enrichedEvent = await enrichEventWithVenueImage(updatedEvent, new Map());

  return res.status(200).json({
    success: true,
    data: { event: enrichedEvent },
    message: 'Event updated successfully',
    timestamp: new Date().toISOString()
  });
});

const deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findOne({ eventId: req.params.id });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  if (event.organizerId !== req.user.userId && !userHasRole(req.user, 'admin')) {
    return next(new AppError('Not authorized to delete this event', 403));
  }

  const authorization = req.headers.authorization;
  const cleanupResults = await Promise.allSettled([
    cleanupBookingEventData(event.eventId, authorization),
    cleanupVenueVendorEventData(event.eventId, authorization)
  ]);

  const cleanupWarnings = cleanupResults
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return null;
      }

      return formatCleanupFailure(
        index === 0 ? 'booking-service' : 'venue-vendor-service',
        result.reason
      );
    })
    .filter(Boolean);

  if (cleanupWarnings.length > 0) {
    console.warn(`Event cleanup warnings for ${event.eventId}:`, cleanupWarnings);
  }

  await Event.deleteOne({ _id: event._id });

  return res.status(200).json({
    success: true,
    data: cleanupWarnings.length > 0 ? { cleanupWarnings } : null,
    message:
      cleanupWarnings.length > 0
        ? 'Event deleted permanently with cleanup warnings'
        : 'Event deleted permanently',
    timestamp: new Date().toISOString()
  });
});

const getEventsByOrganizer = catchAsync(async (req, res, next) => {
  await Event.syncPastEventStatuses();

  if (req.user.userId !== req.params.organizerId && !userHasRole(req.user, 'admin')) {
    return next(new AppError('Not authorized to view these events', 403));
  }

  const events = await Event.findByOrganizer(req.params.organizerId, req.query);

  return res.status(200).json({
    success: true,
    data: { events },
    message: `Found ${events.length} events for organizer`,
    timestamp: new Date().toISOString()
  });
});

const getUpcomingEvents = catchAsync(async (req, res) => {
  await Event.syncPastEventStatuses();

  const events = await Event.findUpcoming(parseInt(req.query.limit || 10, 10));
  const enrichedEvents = await enrichEventsWithVenueImages(events);

  return res.status(200).json({
    success: true,
    data: { events: enrichedEvents },
    message: `Found ${events.length} upcoming events`,
    timestamp: new Date().toISOString()
  });
});

const searchEvents = catchAsync(async (req, res, next) => {
  await Event.syncPastEventStatuses();

  if (!req.query.q) {
    return next(new AppError('Search term is required', 400));
  }

  const events = await Event.searchEvents(req.query.q, req.query);
  const enrichedEvents = await enrichEventsWithVenueImages(events);

  return res.status(200).json({
    success: true,
    data: { events: enrichedEvents },
    message: `Found ${events.length} events matching "${req.query.q}"`,
    timestamp: new Date().toISOString()
  });
});

const updateAttendeeCount = catchAsync(async (req, res, next) => {
  if (typeof req.body.count !== 'number' || req.body.count < 0) {
    return next(new AppError('Invalid attendee count', 400));
  }

  const event = await Event.findOne({ eventId: req.params.id });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  if (event.organizerId !== req.user.userId && !userHasRole(req.user, 'admin')) {
    return next(new AppError('Not authorized to update attendee count', 403));
  }

  const updatedEvent = await event.updateAttendeeCount(req.body.count);

  return res.status(200).json({
    success: true,
    data: { event: updatedEvent },
    message: 'Attendee count updated successfully',
    timestamp: new Date().toISOString()
  });
});

const getEventStats = catchAsync(async (req, res, next) => {
  if (!userHasRole(req.user, 'admin')) {
    return next(new AppError('Admin access required', 403));
  }

  await Event.syncPastEventStatuses();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [
    totalEvents,
    activeEvents,
    upcomingEvents,
    eventsToday,
    completedEvents,
    totalCapacity,
    totalAttendees
  ] = await Promise.all([
    Event.countDocuments({}),
    Event.countDocuments({ isActive: true }),
    Event.countDocuments({ eventDate: { $gte: new Date() }, status: { $in: ['Planned', 'Open'] } }),
    Event.countDocuments({
      eventDate: { $gte: startOfToday, $lt: startOfTomorrow },
      status: { $in: ['Planned', 'Open'] }
    }),
    Event.countDocuments({ status: 'Completed' }),
    Event.aggregate([{ $group: { _id: null, total: { $sum: '$capacity' } } }]),
    Event.aggregate([{ $group: { _id: null, total: { $sum: '$attendees' } } }])
  ]);

  const capacityTotal = totalCapacity[0]?.total || 0;
  const attendeeTotal = totalAttendees[0]?.total || 0;

  return res.status(200).json({
    success: true,
    data: {
      stats: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        eventsToday,
        completedEvents,
        totalCapacity: capacityTotal,
        totalAttendees: attendeeTotal,
        capacityUtilization: capacityTotal
          ? `${((attendeeTotal / capacityTotal) * 100).toFixed(2)}%`
          : '0%'
      }
    },
    message: 'Event statistics retrieved successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
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
};
