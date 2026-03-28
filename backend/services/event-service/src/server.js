require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');

const config = require('./config');
const { connectDB } = require('./config/database');
const { requestLogger, apiRateLimiter, globalErrorHandler } = require('./middleware');
const { eventRoutes } = require('./routes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(apiRateLimiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'event-service',
    version: '1.0.0',
    environment: config.server.nodeEnv
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    service: 'EventZen Event Management Service',
    version: 'v1.0.0',
    endpoints: {
      events: '/api/v1/events',
      upcoming: '/api/v1/events/upcoming',
      search: '/api/v1/events/search',
      stats: '/api/v1/events/admin/stats'
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/events', eventRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.use(globalErrorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.server.port, () => {
      console.log(`Event service listening on port ${config.server.port}`);
    });

    const gracefulShutdown = (signal) => {
      server.close(() => {
        mongoose.connection.close(false, () => {
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start Event Service:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
