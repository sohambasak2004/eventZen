require('dotenv').config();

const config = {
  server: {
    port: Number(process.env.PORT) || 3002,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  database: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eventzen_events',
    mongodbTestUri:
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/eventzen_events_test'
  },
  jwt: {
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '../auth-service/public.pem',
    algorithm: process.env.JWT_ALGORITHM || 'RS256'
  },
  cors: {
    allowedOrigins:
      process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) || [
        'http://localhost:5173',
        'http://localhost:3000'
      ]
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE) || 12,
    maxPageSize: Number(process.env.MAX_PAGE_SIZE) || 100
  },
  externalServices: {
    venueVendorServiceUrl:
      process.env.VENUE_VENDOR_SERVICE_URL || 'http://localhost:3001/api/v1',
    bookingServiceUrl:
      process.env.BOOKING_SERVICE_URL || 'http://localhost:8082/api/v1'
  }
};

module.exports = config;
