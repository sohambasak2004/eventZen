const { authenticateToken, optionalAuth, requireRole } = require('./auth');
const { requestLogger, apiRateLimiter, createUserRateLimit } = require('./logging');
const { globalErrorHandler, catchAsync, AppError } = require('./errorHandler');
const {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventQueryValidation,
  handleValidationErrors
} = require('./validation');

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requestLogger,
  apiRateLimiter,
  createUserRateLimit,
  globalErrorHandler,
  catchAsync,
  AppError,
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventQueryValidation,
  handleValidationErrors
};
