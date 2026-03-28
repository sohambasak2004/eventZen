const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const venueImageSchema = new mongoose.Schema({
  url: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) {
          return true;
        }

        const isHttpUrl = /^https?:\/\/\S+$/i.test(value);
        const isImageDataUri = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);
        return isHttpUrl || isImageDataUri;
      },
      message: 'Image must be a valid http(s) URL or base64 image data URI'
    }
  },
  alt: {
    type: String,
    trim: true,
    maxLength: [200, 'Image alt text cannot exceed 200 characters']
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const venueSchema = new mongoose.Schema({
  venueId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  venueName: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true,
    maxLength: [200, 'Venue name cannot exceed 200 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'USA'
    }
  },
  capacity: {
    type: Number,
    required: [true, 'Venue capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    index: true
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price per day cannot be negative'],
    index: true
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [venueImageSchema],
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[1-9][\d]{0,15}$/, 'Invalid phone number format']
    }
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
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
venueSchema.index({ 'address.city': 1, capacity: 1, pricePerDay: 1 });
venueSchema.index({ venueName: 'text', description: 'text' });
venueSchema.index({ createdAt: -1 });

venueSchema.virtual('primaryImage').get(function() {
  return (this.images || []).find((image) => image.isPrimary) || this.images?.[0] || null;
});

const syncVenueActiveFlags = (venue) => {
  const availabilityIsActive = venue.availability?.isActive;

  if (typeof venue.isActive === 'boolean') {
    if (!venue.availability) {
      venue.availability = {};
    }

    venue.availability.isActive = venue.isActive;
    return;
  }

  if (typeof availabilityIsActive === 'boolean') {
    venue.isActive = availabilityIsActive;
  }
};

// Pre-save middleware
venueSchema.pre('save', function(next) {
  syncVenueActiveFlags(this);

  if (!Array.isArray(this.amenities) || this.amenities.length === 0) {
    this.amenities = undefined;
  }

  // Ensure only one primary image
  const primaryImages = (this.images || []).filter(img => img.isPrimary);
  if (primaryImages.length > 1) {
    this.images.forEach((img, index) => {
      img.isPrimary = index === 0;
    });
  }

  if (!Array.isArray(this.images) || this.images.length === 0) {
    this.images = undefined;
  }

  const hasContactInfo = this.contactInfo?.email || this.contactInfo?.phone;
  if (this.contactInfo && !hasContactInfo) {
    this.contactInfo = undefined;
  }

  next();
});

// Instance methods
venueSchema.methods.checkAvailability = function(startDate, endDate) {
  return this.availability?.isActive ?? true;
};

module.exports = mongoose.model('Venue', venueSchema);
