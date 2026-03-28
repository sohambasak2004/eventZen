const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contractItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    default: uuidv4
  },
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const eventVendorSchema = new mongoose.Schema({
  contractId: {
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
  vendorId: {
    type: String,
    required: [true, 'Vendor ID is required'],
    index: true
  },
  organizerId: {
    type: String,
    required: [true, 'Organizer ID is required'],
    index: true
  },
  serviceDetails: {
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      enum: [
        'catering',
        'photography',
        'videography',
        'music_dj',
        'lighting',
        'decoration',
        'security',
        'transportation',
        'cleaning',
        'equipment_rental',
        'entertainment',
        'floral',
        'planning',
        'other'
      ]
    },
    packageId: String, // Reference to vendor's package
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true
    },
    customRequirements: [{
      requirement: String,
      approved: {
        type: Boolean,
        default: false
      },
      additionalCost: {
        type: Number,
        min: [0, 'Additional cost cannot be negative'],
        default: 0
      }
    }]
  },
  schedule: {
    serviceDate: {
      type: Date,
      required: [true, 'Service date is required'],
      index: true
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required']
    },
    setupTime: {
      type: Number, // hours before start time
      min: [0, 'Setup time cannot be negative'],
      default: 1
    },
    cleanupTime: {
      type: Number, // hours after end time
      min: [0, 'Cleanup time cannot be negative'],
      default: 1
    },
    flexibility: {
      type: String,
      enum: ['none', 'partial', 'flexible'],
      default: 'none'
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    agreedPrice: {
      type: Number,
      required: [true, 'Agreed price is required'],
      min: [0, 'Agreed price cannot be negative'],
      index: true
    },
    priceBreakdown: [contractItemSchema],
    additionalCharges: [{
      description: String,
      amount: {
        type: Number,
        min: [0, 'Additional charge cannot be negative']
      }
    }],
    discount: {
      amount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative'],
        default: 0
      },
      reason: String
    },
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
  contract: {
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'under_review',
        'negotiating',
        'approved',
        'signed',
        'active',
        'completed',
        'cancelled',
        'terminated'
      ],
      default: 'draft',
      index: true
    },
    terms: {
      type: String,
      trim: true
    },
    deliverables: [{
      item: String,
      description: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'delayed'],
        default: 'pending'
      }
    }],
    milestones: [{
      milestone: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      paymentDue: {
        type: Number,
        min: [0, 'Payment due cannot be negative']
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'overdue'],
        default: 'pending'
      }
    }],
    signedAt: Date,
    signedByVendor: {
      name: String,
      signature: String,
      timestamp: Date
    },
    signedByClient: {
      name: String,
      signature: String,
      timestamp: Date
    },
    contractDocument: {
      url: String,
      uploadedAt: Date
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded', 'disputed'],
      default: 'pending',
      index: true
    },
    paymentTerms: {
      type: String,
      enum: ['advance_full', 'advance_75', 'advance_50', 'advance_25', 'on_completion', 'net_30'],
      default: 'advance_50'
    },
    advanceAmount: {
      type: Number,
      min: [0, 'Advance amount cannot be negative']
    },
    advancePaid: {
      type: Boolean,
      default: false
    },
    finalPaymentDue: Date,
    transactions: [{
      transactionId: String,
      amount: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ['advance', 'milestone', 'final', 'refund', 'penalty'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
      },
      paymentMethod: String,
      transactionDate: {
        type: Date,
        default: Date.now
      },
      reference: String,
      notes: String
    }]
  },
  performance: {
    qualityRating: {
      type: Number,
      min: [1, 'Quality rating must be at least 1'],
      max: [5, 'Quality rating cannot exceed 5']
    },
    timelinessRating: {
      type: Number,
      min: [1, 'Timeliness rating must be at least 1'],
      max: [5, 'Timeliness rating cannot exceed 5']
    },
    professionalismRating: {
      type: Number,
      min: [1, 'Professionalism rating must be at least 1'],
      max: [5, 'Professionalism rating cannot exceed 5']
    },
    overallRating: {
      type: Number,
      min: [1, 'Overall rating must be at least 1'],
      max: [5, 'Overall rating cannot exceed 5']
    },
    feedback: {
      type: String,
      trim: true
    },
    issues: [{
      issue: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
      },
      reportedAt: {
        type: Date,
        default: Date.now
      },
      resolvedAt: Date,
      resolution: String
    }],
    completedDeliverables: {
      type: Number,
      min: [0, 'Completed deliverables cannot be negative'],
      default: 0
    },
    totalDeliverables: {
      type: Number,
      min: [0, 'Total deliverables cannot be negative'],
      default: 0
    }
  },
  communication: {
    primaryContact: {
      vendor: {
        name: String,
        email: String,
        phone: String
      },
      client: {
        name: String,
        email: String,
        phone: String
      }
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
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }],
    lastContactDate: Date,
    communicationPreference: {
      type: String,
      enum: ['email', 'phone', 'sms', 'app'],
      default: 'email'
    }
  },
  compliance: {
    insuranceRequired: {
      type: Boolean,
      default: false
    },
    insuranceVerified: {
      type: Boolean,
      default: false
    },
    licenseRequired: {
      type: Boolean,
      default: false
    },
    licenseVerified: {
      type: Boolean,
      default: false
    },
    contractSigned: {
      type: Boolean,
      default: false
    },
    backgroundCheckRequired: {
      type: Boolean,
      default: false
    },
    backgroundCheckCompleted: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['direct', 'platform', 'referral', 'repeat'],
      default: 'platform'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    tags: [String],
    internalNotes: String
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: String,
  approvedBy: String,
  approvedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
eventVendorSchema.index({ eventId: 1, vendorId: 1 });
eventVendorSchema.index({ 'schedule.serviceDate': 1 });
eventVendorSchema.index({ organizerId: 1, 'contract.status': 1 });
eventVendorSchema.index({ vendorId: 1, 'contract.status': 1 });
eventVendorSchema.index({ 'contract.status': 1, 'payment.status': 1 });
eventVendorSchema.index({ createdAt: -1 });
eventVendorSchema.index({ 'payment.finalPaymentDue': 1 });

// Virtual for service duration in hours
eventVendorSchema.virtual('serviceDurationHours').get(function() {
  if (!this.schedule.startTime || !this.schedule.endTime) return 0;
  const diffMs = this.schedule.endTime - this.schedule.startTime;
  return diffMs / (1000 * 60 * 60);
});

// Virtual for total paid amount
eventVendorSchema.virtual('totalPaidAmount').get(function() {
  return this.payment.transactions
    .filter(t => t.status === 'completed' && t.type !== 'refund')
    .reduce((total, t) => total + t.amount, 0);
});

// Virtual for remaining balance
eventVendorSchema.virtual('remainingBalance').get(function() {
  return Math.max(0, this.pricing.totalAmount - this.totalPaidAmount);
});

// Virtual for completion percentage
eventVendorSchema.virtual('completionPercentage').get(function() {
  if (this.performance.totalDeliverables === 0) return 0;
  return (this.performance.completedDeliverables / this.performance.totalDeliverables) * 100;
});

// Virtual for contract status display
eventVendorSchema.virtual('statusDisplay').get(function() {
  const now = new Date();
  const isOverdue = this.payment.finalPaymentDue && now > this.payment.finalPaymentDue;
  const isUpcoming = this.schedule.serviceDate > now;
  const isActive = this.schedule.serviceDate <= now && this.contract.status === 'active';

  return {
    contract: this.contract.status,
    payment: this.payment.status,
    isOverdue,
    isUpcoming,
    isActive,
    needsAttention: isOverdue || this.performance.issues.filter(i => !i.resolvedAt).length > 0
  };
});

// Static methods
eventVendorSchema.statics.findByEventId = function(eventId, options = {}) {
  const query = { eventId };

  if (options.serviceType) {
    query['serviceDetails.serviceType'] = options.serviceType;
  }
  if (options.status) {
    query['contract.status'] = options.status;
  }

  return this.find(query);
};

eventVendorSchema.statics.findByVendorId = function(vendorId, options = {}) {
  const query = { vendorId };

  if (options.status) {
    query['contract.status'] = options.status;
  }
  if (options.dateFrom) {
    query['schedule.serviceDate'] = { $gte: options.dateFrom };
  }
  if (options.dateTo) {
    query['schedule.serviceDate'] = query['schedule.serviceDate'] || {};
    query['schedule.serviceDate'].$lte = options.dateTo;
  }

  return this.find(query);
};

eventVendorSchema.statics.getVendorRevenue = function(vendorId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        vendorId,
        'contract.status': 'completed',
        'schedule.serviceDate': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.totalAmount' },
        totalContracts: { $sum: 1 },
        averageContractValue: { $avg: '$pricing.totalAmount' },
        averageRating: { $avg: '$performance.overallRating' }
      }
    }
  ]);
};

eventVendorSchema.statics.getUpcomingServices = function(vendorId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.find({
    vendorId,
    'contract.status': { $in: ['signed', 'active'] },
    'schedule.serviceDate': { $gte: startDate, $lte: endDate }
  }).sort({ 'schedule.serviceDate': 1 });
};

// Instance methods
eventVendorSchema.methods.calculateTotalAmount = function() {
  const itemsTotal = this.pricing.priceBreakdown.reduce((total, item) => total + item.totalPrice, 0);
  const additionalCharges = this.pricing.additionalCharges.reduce((total, charge) => total + charge.amount, 0);
  const subtotal = (itemsTotal || this.pricing.agreedPrice) + additionalCharges - this.pricing.discount.amount;
  this.pricing.totalAmount = subtotal + this.pricing.taxes;
  return this.pricing.totalAmount;
};

eventVendorSchema.methods.updateContractStatus = function(newStatus, updatedBy, notes = null) {
  const oldStatus = this.contract.status;
  this.contract.status = newStatus;
  this.updatedBy = updatedBy;

  const now = new Date();
  switch (newStatus) {
    case 'signed':
      this.contract.signedAt = now;
      break;
    case 'approved':
      this.approvedBy = updatedBy;
      this.approvedAt = now;
      break;
  }

  // Add note about status change
  if (notes) {
    this.communication.notes.push({
      note: `Contract status changed from ${oldStatus} to ${newStatus}: ${notes}`,
      addedBy: updatedBy,
      isInternal: true
    });
  }

  return this.save();
};

eventVendorSchema.methods.addPayment = function(paymentData) {
  this.payment.transactions.push(paymentData);

  // Update payment status
  const totalPaid = this.totalPaidAmount;
  if (totalPaid >= this.pricing.totalAmount) {
    this.payment.status = 'paid';
  } else if (totalPaid > 0) {
    this.payment.status = 'partial';
  }

  // Check if advance payment is completed
  if (!this.payment.advancePaid && totalPaid >= this.payment.advanceAmount) {
    this.payment.advancePaid = true;
  }

  return this.save();
};

eventVendorSchema.methods.addPerformanceRating = function(ratings) {
  Object.assign(this.performance, ratings);

  // Calculate overall rating if individual ratings are provided
  if (ratings.qualityRating && ratings.timelinessRating && ratings.professionalismRating) {
    this.performance.overallRating = (ratings.qualityRating + ratings.timelinessRating + ratings.professionalismRating) / 3;
  }

  return this.save();
};

eventVendorSchema.methods.checkScheduleConflict = function(vendorId) {
  const buffer = 2 * 60 * 60 * 1000; // 2 hours buffer

  return this.constructor.find({
    vendorId,
    contractId: { $ne: this.contractId },
    'contract.status': { $in: ['signed', 'active'] },
    $or: [
      {
        'schedule.startTime': {
          $lt: new Date(this.schedule.endTime.getTime() + buffer),
          $gt: new Date(this.schedule.startTime.getTime() - buffer)
        }
      },
      {
        'schedule.endTime': {
          $lt: new Date(this.schedule.endTime.getTime() + buffer),
          $gt: new Date(this.schedule.startTime.getTime() - buffer)
        }
      }
    ]
  });
};

// Pre-save middleware
eventVendorSchema.pre('save', function(next) {
  // Calculate total amount if pricing components changed
  if (this.isModified('pricing.agreedPrice') ||
      this.isModified('pricing.priceBreakdown') ||
      this.isModified('pricing.additionalCharges') ||
      this.isModified('pricing.discount') ||
      this.isModified('pricing.taxes')) {
    this.calculateTotalAmount();
  }

  // Update performance metrics
  if (this.isModified('contract.deliverables')) {
    this.performance.totalDeliverables = this.contract.deliverables.length;
    this.performance.completedDeliverables = this.contract.deliverables
      .filter(d => d.status === 'completed').length;
  }

  // Calculate advance amount based on payment terms
  if (this.isModified('pricing.totalAmount') || this.isModified('payment.paymentTerms')) {
    const percentage = this.payment.paymentTerms.includes('75') ? 0.75 :
                      this.payment.paymentTerms.includes('50') ? 0.50 :
                      this.payment.paymentTerms.includes('25') ? 0.25 :
                      this.payment.paymentTerms.includes('full') ? 1.00 : 0;
    this.payment.advanceAmount = this.pricing.totalAmount * percentage;
  }

  // Validate schedule
  if (this.schedule.startTime && this.schedule.endTime && this.schedule.startTime >= this.schedule.endTime) {
    next(new Error('End time must be after start time'));
    return;
  }

  next();
});

module.exports = mongoose.model('EventVendor', eventVendorSchema);