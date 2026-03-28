const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const selectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  },
  { _id: false }
);

const organizerContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    }
  },
  { _id: false }
);

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().split('T')[0];
};

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    eventType: {
      type: String,
      enum: ['Wedding', 'Birthday', 'Corporate', 'Conference', 'Workshop', 'Networking', 'Reception', 'Festival', 'Other'],
      required: true,
      index: true
    },
    eventDate: {
      type: Date,
      required: true,
      index: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]\d|2[0-3]):([0-5]\d)$/
    },
    guestCount: {
      type: Number,
      required: true,
      min: 1
    },
    budget: {
      type: Number,
      default: 0,
      min: 0
    },
    ticketPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    availableVenue: {
      type: selectionSchema,
      default: undefined
    },
    availableVendor: {
      type: selectionSchema,
      default: undefined
    },
    organizerContact: {
      type: organizerContactSchema,
      required: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    attendees: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    status: {
      type: String,
      enum: ['Planned', 'Open', 'Closed', 'Completed', 'Cancelled'],
      default: 'Planned',
      index: true
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'invite-only'],
      default: 'public',
      index: true
    },
    organizerId: {
      type: String,
      required: true,
      index: true
    },
    organizerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    createdBy: {
      type: String,
      required: true
    },
    updatedBy: String,
    stats: {
      views: {
        type: Number,
        default: 0
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    deletedAt: Date,
    deletedBy: String
  },
  {
    collection: 'events',
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => ({
        id: ret.eventId,
        eventId: ret.eventId,
        eventType: ret.eventType,
        eventDate: formatDate(ret.eventDate),
        startTime: ret.startTime,
        endTime: ret.endTime,
        guestCount: ret.guestCount,
        budget: ret.budget,
        ticketPrice: ret.ticketPrice,
        availableVenueId: ret.availableVenue?.id || '',
        availableVenueName: ret.availableVenue?.name || '',
        availableVenue: ret.availableVenue || null,
        availableVendorId: ret.availableVendor?.id || '',
        availableVendorName: ret.availableVendor?.name || '',
        availableVendor: ret.availableVendor || null,
        organizerContact: ret.organizerContact,
        notes: ret.notes || '',
        title: ret.title,
        category: ret.category,
        date: formatDate(ret.date),
        time: ret.time,
        location: ret.location,
        capacity: ret.capacity,
        attendees: ret.attendees,
        description: ret.description || '',
        status: ret.status,
        visibility: ret.visibility,
        organizerId: ret.organizerId,
        organizerEmail: ret.organizerEmail,
        createdAt: ret.createdAt,
        updatedAt: ret.updatedAt
      })
    }
  }
);

eventSchema.index({ title: 'text', notes: 'text', location: 'text', eventType: 'text' });
eventSchema.index({ organizerId: 1, eventDate: 1 });
eventSchema.index({ status: 1, eventDate: 1 });

eventSchema.virtual('availableSpots').get(function availableSpots() {
  return Math.max(0, Number(this.capacity || 0) - Number(this.attendees || 0));
});

eventSchema.pre('validate', function deriveCompatibilityFields(next) {
  this.title = this.title || `${this.eventType} Event`;
  this.category = this.category || this.eventType;
  this.date = this.eventDate || this.date;
  this.time = this.startTime || this.time;
  this.capacity = this.guestCount || this.capacity;
  this.description = this.notes || this.description || '';
  this.location = this.availableVenue?.name || this.location || 'Venue not selected';

  if (this.attendees > this.capacity) {
    this.attendees = this.capacity;
  }

  return next();
});

eventSchema.methods.incrementViews = function incrementViews() {
  this.stats.views += 1;
  return this.save();
};

eventSchema.methods.updateAttendeeCount = function updateAttendeeCount(count) {
  this.attendees = Math.max(0, Math.min(count, this.capacity));
  return this.save();
};

eventSchema.methods.softDelete = function softDelete(deletedBy) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

eventSchema.statics.syncPastEventStatuses = function syncPastEventStatuses() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return this.updateMany(
    {
      eventDate: { $lt: startOfToday },
      status: { $nin: ['Completed', 'Cancelled'] },
      isActive: true
    },
    {
      $set: {
        status: 'Completed'
      }
    }
  );
};

eventSchema.statics.findByOrganizer = function findByOrganizer(organizerId, options = {}) {
  const query = {
    organizerId,
    isActive: true
  };

  if (options.status) {
    query.status = options.status;
  }

  if (options.fromDate || options.toDate) {
    query.eventDate = {};
    if (options.fromDate) {
      query.eventDate.$gte = new Date(options.fromDate);
    }
    if (options.toDate) {
      query.eventDate.$lte = new Date(options.toDate);
    }
  }

  return this.find(query).sort({ eventDate: 1 });
};

eventSchema.statics.findUpcoming = function findUpcoming(limit = 10) {
  return this.find({
    eventDate: { $gte: new Date() },
    visibility: 'public',
    isActive: true,
    status: { $in: ['Planned', 'Open'] }
  })
    .sort({ eventDate: 1, startTime: 1 })
    .limit(limit);
};

eventSchema.statics.searchEvents = function searchEvents(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true,
    visibility: options.visibility || 'public'
  };

  if (options.category) {
    query.category = options.category;
  }

  return this.find(query, { score: { $meta: 'textScore' } }).sort({
    score: { $meta: 'textScore' }
  });
};

eventSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function hideDeleted() {
  if (!this.getQuery().includeDeleted) {
    this.where({ isActive: true });
  }
});

module.exports = mongoose.model('Event', eventSchema);
