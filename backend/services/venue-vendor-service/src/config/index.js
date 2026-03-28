require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eventzen_venue_vendor',
    mongodbTestUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/eventzen_venue_vendor_test',
  },
  jwt: {
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '../auth-service/public.pem',
    algorithm: process.env.JWT_ALGORITHM || 'RS256',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  geospatial: {
    defaultSearchRadiusKm: parseInt(process.env.DEFAULT_SEARCH_RADIUS_KM) || 50,
    maxSearchRadiusKm: parseInt(process.env.MAX_SEARCH_RADIUS_KM) || 200,
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100,
  },
  externalServices: {
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
    eventServiceUrl: process.env.EVENT_SERVICE_URL || 'http://localhost:3002',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
  },
  upload: {
    directory: process.env.UPLOAD_DIR || 'uploads/',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
};

// Validation
if (!config.database.mongodbUri) {
  throw new Error('MONGODB_URI environment variable is required');
}

module.exports = config;
