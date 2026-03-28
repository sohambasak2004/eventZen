require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connectDB } = require('./config/database');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { venueRoutes, vendorRoutes, eventRoutes } = require('./routes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  skip: (req) => Boolean(req.headers.authorization),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'venue-vendor-service',
    version: '1.0.0',
    environment: config.server.nodeEnv
  });
});

app.use('/api/v1/venues', venueRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/events', eventRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.use(globalErrorHandler);

let server;

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: closing HTTP server`);
  server?.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

const startServer = async () => {
  await connectDB();

  const port = config.server.port;
  server = app.listen(port, () => {
    console.log(`Venue & Vendor service listening on port ${port}`);
  });

  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start Venue & Vendor Service:', error);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
