// Initialize EventZen Venue & Vendor databases
print('Starting database initialization...');

// Switch to the main database
db = db.getSiblingDB('eventzen_venue_vendor');

// Create collections and indexes
db.createCollection('venues');
db.createCollection('vendors');
db.createCollection('eventvenuebookings');
db.createCollection('eventvendors');

// Create indexes for venues
print('Creating indexes for venues collection...');
db.venues.createIndex({ "location": "2dsphere" });
db.venues.createIndex({ "address.city": 1, "capacity": 1, "pricePerDay": 1 });
db.venues.createIndex({ "venueName": "text", "description": "text" });
db.venues.createIndex({ "createdAt": -1 });
db.venues.createIndex({ "venueId": 1 }, { unique: true });
db.venues.createIndex({ "isActive": 1 });

// Create indexes for vendors
print('Creating indexes for vendors collection...');
db.vendors.createIndex({ "serviceArea.location": "2dsphere" });
db.vendors.createIndex({ "serviceType": 1, "address.city": 1, "rating.average": -1 });
db.vendors.createIndex({ "vendorName": "text", "businessName": "text", "description": "text" });
db.vendors.createIndex({ "contactInfo.email": 1 });
db.vendors.createIndex({ "createdAt": -1 });
db.vendors.createIndex({ "vendorId": 1 }, { unique: true });
db.vendors.createIndex({ "verification.isVerified": 1, "isActive": 1 });

// Create indexes for bookings
print('Creating indexes for bookings collection...');
db.eventvenuebookings.createIndex({ "eventId": 1, "venueId": 1 });
db.eventvenuebookings.createIndex({ "bookingDates.startDate": 1, "bookingDates.endDate": 1 });
db.eventvenuebookings.createIndex({ "organizerId": 1, "booking.status": 1 });
db.eventvenuebookings.createIndex({ "booking.status": 1, "payment.status": 1 });
db.eventvenuebookings.createIndex({ "createdAt": -1 });
db.eventvenuebookings.createIndex({ "bookingId": 1 }, { unique: true });
db.eventvenuebookings.createIndex({ "payment.paymentDueDate": 1 });

// Create indexes for contracts
print('Creating indexes for contracts collection...');
db.eventvendors.createIndex({ "eventId": 1, "vendorId": 1 });
db.eventvendors.createIndex({ "schedule.serviceDate": 1 });
db.eventvendors.createIndex({ "organizerId": 1, "contract.status": 1 });
db.eventvendors.createIndex({ "vendorId": 1, "contract.status": 1 });
db.eventvendors.createIndex({ "contract.status": 1, "payment.status": 1 });
db.eventvendors.createIndex({ "createdAt": -1 });
db.eventvendors.createIndex({ "contractId": 1 }, { unique: true });
db.eventvendors.createIndex({ "payment.finalPaymentDue": 1 });

// Create test database
db = db.getSiblingDB('eventzen_venue_vendor_test');
print('Creating test database collections...');
db.createCollection('venues');
db.createCollection('vendors');
db.createCollection('eventvenuebookings');
db.createCollection('eventvendors');

print('Database initialization completed successfully!');

// Insert sample data for development (optional)
if (typeof INIT_SAMPLE_DATA !== 'undefined' && INIT_SAMPLE_DATA) {
  print('Inserting sample data...');

  // Switch back to main database
  db = db.getSiblingDB('eventzen_venue_vendor');

  // Sample venue data
  db.venues.insertMany([
    {
      venueId: "550e8400-e29b-41d4-a716-446655440001",
      venueName: "Grand Convention Center",
      description: "Large convention center perfect for corporate events and conferences",
      address: {
        street: "123 Convention Ave",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA"
      },
      location: {
        type: "Point",
        coordinates: [-74.0059, 40.7128]
      },
      capacity: 1000,
      pricePerDay: 5000,
      halls: [
        {
          hallName: "Main Hall",
          capacity: 800
        },
        {
          hallName: "Conference Room A",
          capacity: 100
        }
      ],
      contactInfo: {
        email: "contact@grandconvention.com",
        phone: "+1-555-0123"
      },
      isActive: true,
      createdBy: "admin-user-id",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  // Sample vendor data
  db.vendors.insertMany([
    {
      vendorId: "550e8400-e29b-41d4-a716-446655440002",
      vendorName: "Elite Catering Services",
      businessName: "Elite Catering LLC",
      serviceType: "catering",
      description: "Premium catering services for corporate and private events",
      contactInfo: {
        email: "info@elitecatering.com",
        phone: "+1-555-0456"
      },
      address: {
        street: "456 Food St",
        city: "New York",
        state: "NY",
        zipCode: "10002",
        country: "USA"
      },
      serviceArea: {
        cities: ["New York", "Manhattan", "Brooklyn"],
        radius: 50,
        location: {
          type: "Point",
          coordinates: [-74.0059, 40.7128]
        }
      },
      packages: [
        {
          packageName: "Corporate Lunch Package",
          description: "Lunch catering for corporate events",
          basePrice: 25,
          priceType: "per_person",
          features: ["Appetizers", "Main Course", "Dessert", "Beverages"],
          isActive: true
        }
      ],
      rating: {
        average: 4.5,
        count: 23
      },
      verification: {
        isVerified: true
      },
      isActive: true,
      createdBy: "admin-user-id",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  print('Sample data inserted successfully!');
}