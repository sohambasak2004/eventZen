const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const vendorSchema = new mongoose.Schema({
  vendorId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
    maxLength: [200, 'Vendor name cannot exceed 200 characters'],
    index: true
  },
  businessName: {
    type: String,
    trim: true,
    maxLength: [200, 'Business name cannot exceed 200 characters']
  },
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
    ],
    index: true
  },
  website: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorSchema.index({ serviceType: 1, isActive: 1 });
vendorSchema.index({ vendorName: 'text', businessName: 'text', website: 'text' });
vendorSchema.index({ createdAt: -1 });

// Pre-save middleware
vendorSchema.pre('save', function(next) {
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
