const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('../config');

const requestLogger =
  config.server.nodeEnv === 'development' ? morgan('dev') : morgan('combined');

const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client. Please try again later.'
  }
});

const createUserRateLimit = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip,
    message: {
      success: false,
      message: 'Rate limit exceeded for this user.'
    }
  });

module.exports = {
  requestLogger,
  apiRateLimiter,
  createUserRateLimit
};
