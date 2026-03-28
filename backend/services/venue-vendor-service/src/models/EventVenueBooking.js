const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventVenueBookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  eventId: {
    type: String,
    required: [true, 'Event ID is required'],
    index: true
  },
  venueId: {
    type: String,
    required: [true, 'Venue ID is required'],
    index: true
  },
  hallIds: [{
    type: String // References to venue hall IDs if specific halls are booked
  }],
  organizerId: {
    type: String,
    required: [true, 'Organizer ID is required'],
    index: true
  },
  bookingDates: {
    startDate: {
      type: Date,
      required: [true, 'Booking start date is required'],
      index: true
    },
    endDate: {
      type: Date,
      required: [true, 'Booking end date is required'],
      index: true
    },
    setupStartTime: {
      type: Date,
      required: [true, 'Setup start time is required']
    },
    eventStartTime: {
      type: Date,
      required: [true, 'Event start time is required']
    },
    eventEndTime: {
      type: Date,
      required: [true, 'Event end time is required']
    },
    cleanupEndTime: {
      type: Date,
      required: [true, 'Cleanup end time is required']
    }
  },
  attendeeCount: {
    expected: {
      type: Number,
      required: [true, 'Expected attendee count is required'],
      min: [1, 'Expected attendee count must be at least 1']
    },
    actual: {
      type: Number,
      min: [0, 'Actual attendee count cannot be negative']
    }
  },
  booking: {
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'in_progress',
        'no_show'
      ],
      default: 'pending',
      index: true
    },
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    completedAt: Date
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    additionalCharges: [{
      description: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true,
        min: [0, 'Additional charge amount cannot be negative']
      },
      type: {
        type: String,
        enum: ['service', 'equipment', 'overtime', 'damage', 'other'],
        default: 'other'
      }
    }],
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      default: 0
    },
    discountReason: String,
    taxes: {
      type: Number,
      min: [0, 'Taxes cannot be negative'],
      default: 0
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded', 'failed'],
      default: 'pending',
      index: true
    },
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'online']
    },
    depositRequired: {
      type: Number,
      min: [0, 'Deposit cannot be negative']
    },
    depositPaid: {
      type: Number,
      min: [0, 'Deposit paid cannot be negative'],
      default: 0
    },
    remainingBalance: {
      type: Number,
      min: [0, 'Remaining balance cannot be negative']
    },
    paymentDueDate: Date,
    transactions: [{
      transactionId: String,
      amount: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ['deposit', 'balance', 'refund'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      },
      paymentMethod: String,
      transactionDate: {
        type: Date,
        default: Date.now
      },
      reference: String
    }]
  },
  requirements: {
    specialRequests: [{
      request: String,
      approved: {
        type: Boolean,
        default: false
      },
      response: String,
      cost: {
        type: Number,
        min: [0, 'Cost cannot be negative'],
        default: 0
      }
    }],
    equipmentNeeded: [{
      equipment: String,
      quantity: {
        type: Number,
        min: [1, 'Quantity must be at least 1'],
        default: 1
      },
      supplier: {
        type: String,
        enum: ['venue', 'client', 'third_party'],
        default: 'venue'
      },
      cost: {
        type: Number,
        min: [0, 'Cost cannot be negative'],
        default: 0
      }
    }],
    catering: {
      required: {
        type: Boolean,
        default: false
      },
      type: String, // breakfast, lunch, dinner, snacks, etc.
      headcount: Number,
      dietaryRestrictions: [String],
      supplier: {
        type: String,
        enum: ['venue', 'client', 'third_party']
      }
    }
  },
  contracts: {
    terms: String,
    signedAt: Date,
    signedBy: String,
    contractDocument: {
      url: String,
      uploadedAt: Date
    }
  },
  communication: {
    primaryContact: {
      name: String,
      email: String,
      phone: String
    },
    notes: [{
      note: String,
      addedBy: String,
      addedAt: {
        type: Date,
        default: Date.now
      },
      isInternal: {
        type: Boolean,
        default: false
      }
    }],
    lastContactDate: Date
  },
  metadata: {
    source: {
      type: String,
      enum: ['website', 'phone', 'email', 'referral', 'walk_in'],
      default: 'website'
    },
    ipAddress: String,
    userAgent: String,
    referralSource: String
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
eventVenueBookingSchema.index({ eventId: 1, venueId: 1 });
eventVenueBookingSchema.index({ 'bookingDates.startDate': 1, 'bookingDates.endDate': 1 });
eventVenueBookingSchema.index({ organizerId: 1, 'booking.status': 1 });
eventVenueBookingSchema.index({ 'booking.status': 1, 'payment.status': 1 });
eventVenueBookingSchema.index({ createdAt: -1 });
eventVenueBookingSchema.index({ 'payment.paymentDueDate': 1 });

// Virtual for booking duration in days
eventVenueBookingSchema.virtual('bookingDurationDays').get(function() {
  if (!this.bookingDates.startDate || !this.bookingDates.endDate) return 0;
  const diffTime = Math.abs(this.bookingDates.endDate - this.bookingDates.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for total additional charges
eventVenueBookingSchema.virtual('totalAdditionalCharges').get(function() {
  return this.pricing.additionalCharges.reduce((total, charge) => total + charge.amount, 0);
});

// Virtual for total paid amount
eventVenueBookingSchema.virtual('totalPaidAmount').get(function() {
  return this.payment.transactions
    .filter(t => t.status === 'completed' && t.type !== 'refund')
    .reduce((total, t) => total + t.amount, 0);
});

// Virtual for status display
eventVenueBookingSchema.virtual('statusDisplay').get(function() {
  return {
    booking: this.booking.status,
    payment: this.payment.status,
    isOverdue: this.payment.paymentDueDate && new Date() > this.payment.paymentDueDate,
    isUpcoming: this.bookingDates.startDate > new Date(),
    isActive: this.bookingDates.startDate <= new Date() && this.bookingDates.endDate >= new Date(),
    isPast: this.bookingDates.endDate < new Date()
  };
});

// Static methods
eventVenueBookingSchema.statics.findConflictingBookings = function(venueId, startDate, endDate, excludeBookingId = null) {
  const query = {
    venueId,
    'booking.status': { $in: ['confirmed', 'in_progress'] },
    $or: [
      {
        'bookingDates.setupStartTime': { $lt: endDate },
        'bookingDates.cleanupEndTime': { $gt: startDate }
      }
    ]
  };

  if (excludeBookingId) {
    query.bookingId = { $ne: excludeBookingId };
  }

  return this.find(query);
};

eventVenueBookingSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = {
    $or: [
      {
        'bookingDates.startDate': { $gte: startDate, $lte: endDate }
      },
      {
        'bookingDates.endDate': { $gte: startDate, $lte: endDate }
      },
      {
        'bookingDates.startDate': { $lte: startDate },
        'bookingDates.endDate': { $gte: endDate }
      }
    ]
  };

  if (options.venueId) {
    query.venueId = options.venueId;
  }
  if (options.status) {
    query['booking.status'] = options.status;
  }
  if (options.organizerId) {
    query.organizerId = options.organizerId;
  }

  return this.find(query);
};

eventVenueBookingSchema.statics.getRevenueStats = function(startDate, endDate, venueId = null) {
  const matchQuery = {
    'booking.status': 'completed',
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (venueId) {
    matchQuery.venueId = venueId;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.totalAmount' },
        totalBookings: { $sum: 1 },
        averageBookingValue: { $avg: '$pricing.totalAmount' },
        totalAttendees: { $sum: '$attendeeCount.actual' }
      }
    }
  ]);
};

// Instance methods
eventVenueBookingSchema.methods.calculateTotalAmount = function() {
  const additionalCharges = this.totalAdditionalCharges;
  const subtotal = this.pricing.basePrice + additionalCharges - this.pricing.discount;
  this.pricing.totalAmount = subtotal + this.pricing.taxes;
  return this.pricing.totalAmount;
};

eventVenueBookingSchema.methods.updateBookingStatus = function(newStatus, updatedBy, reason = null) {
  const oldStatus = this.booking.status;
  this.booking.status = newStatus;
  this.updatedBy = updatedBy;

  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.booking.confirmedAt = now;
      break;
    case 'cancelled':
      this.booking.cancelledAt = now;
      if (reason) this.booking.cancellationReason = reason;
      break;
    case 'completed':
      this.booking.completedAt = now;
      break;
  }

  // Add note about status change
  this.communication.notes.push({
    note: `Booking status changed from ${oldStatus} to ${newStatus}${reason ? ': ' + reason : ''}`,
    addedBy: updatedBy,
    isInternal: true
  });

  return this.save();
};

eventVenueBookingSchema.methods.addPayment = function(paymentData) {
  this.payment.transactions.push(paymentData);

  // Update payment status based on total paid
  const totalPaid = this.totalPaidAmount;
  if (totalPaid >= this.pricing.totalAmount) {
    this.payment.status = 'paid';
  } else if (totalPaid > 0) {
    this.payment.status = 'partial';
  }

  this.payment.remainingBalance = Math.max(0, this.pricing.totalAmount - totalPaid);

  return this.save();
};

eventVenueBookingSchema.methods.checkAvailability = function() {
  return this.constructor.findConflictingBookings(
    this.venueId,
    this.bookingDates.setupStartTime,
    this.bookingDates.cleanupEndTime,
    this.bookingId
  ).then(conflicts => conflicts.length === 0);
};

// Pre-save middleware
eventVenueBookingSchema.pre('save', function(next) {
  // Calculate total amount if pricing components changed
  if (this.isModified('pricing.basePrice') ||
      this.isModified('pricing.additionalCharges') ||
      this.isModified('pricing.discount') ||
      this.isModified('pricing.taxes')) {
    this.calculateTotalAmount();
  }

  // Update remaining balance
  if (this.isModified('payment.transactions') || this.isModified('pricing.totalAmount')) {
    const totalPaid = this.payment.transactions
      .filter(t => t.status === 'completed' && t.type !== 'refund')
      .reduce((total, t) => total + t.amount, 0);
    this.payment.remainingBalance = Math.max(0, this.pricing.totalAmount - totalPaid);
  }

  // Validate date logic
  if (this.bookingDates.startDate >= this.bookingDates.endDate) {
    next(new Error('End date must be after start date'));
    return;
  }

  if (this.bookingDates.setupStartTime >= this.bookingDates.eventStartTime) {
    next(new Error('Event start time must be after setup start time'));
    return;
  }

  if (this.bookingDates.eventEndTime >= this.bookingDates.cleanupEndTime) {
    next(new Error('Cleanup end time must be after event end time'));
    return;
  }

  next();
});

module.exports = mongoose.model('EventVenueBooking', eventVenueBookingSchema);