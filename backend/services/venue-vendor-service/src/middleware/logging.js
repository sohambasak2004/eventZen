const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Custom Morgan token for user ID
 */
morgan.token('user', (req) => {
  return req.user ? req.user.userId : 'anonymous';
});

/**
 * Custom Morgan token for request ID
 */
morgan.token('reqId', (req) => {
  return req.id || 'no-id';
});

/**
 * Custom Morgan format
 */
const customFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :reqId';

/**
 * Request logging middleware
 */
const requestLogger = morgan(customFormat, {
  skip: (req, res) => {
    // Skip logging for health checks in production
    if (config.server.nodeEnv === 'production' && req.url === '/health') {
      return true;
    }
    return false;
  },
  stream: {
    write: (message) => {
      // Remove trailing newline
      console.log(message.trim());
    }
  }
});

/**
 * Error logging middleware
 */
const errorLogger = morgan(customFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => {
      console.error(message.trim());
    }
  }
});

/**
 * Rate limiting middleware
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Strict rate limiting for auth endpoints
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for sensitive endpoints
  message: {
    error: 'Too many requests',
    message: 'Too many attempts from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many attempts from this IP, please try again later.',
      retryAfter: 900,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API rate limiting for different user types
 */
const createUserRateLimit = (windowMs, maxRequests) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? `user:${req.user.userId}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'API rate limit exceeded. Please slow down your requests.',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

/**
 * Request ID middleware
 */
const requestId = (req, res, next) => {
  req.id = req.get('X-Request-ID') ||
           req.get('X-Correlation-ID') ||
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  res.set('X-Request-ID', req.id);
  next();
};

/**
 * Request timing middleware
 */
const requestTiming = (req, res, next) => {
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration}ms`);
    }
  });

  next();
};

/**
 * User activity logging middleware
 */
const userActivityLogger = (req, res, next) => {
  if (req.user && req.method !== 'GET') {
    const activity = {
      userId: req.user.userId,
      action: `${req.method} ${req.route?.path || req.url}`,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // In production, this could be sent to a logging service
    console.log('User Activity:', JSON.stringify(activity));
  }

  next();
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  // Extract version from URL path or headers
  const pathVersion = req.url.match(/^\/api\/v(\d+)\//);
  const headerVersion = req.get('API-Version');

  req.apiVersion = pathVersion ? pathVersion[1] : (headerVersion || '1');

  // Set response header
  res.set('API-Version', req.apiVersion);

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove powered by header for security
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  rateLimiter,
  strictRateLimiter,
  createUserRateLimit,
  requestId,
  requestTiming,
  userActivityLogger,
  apiVersioning,
  securityHeaders
};
