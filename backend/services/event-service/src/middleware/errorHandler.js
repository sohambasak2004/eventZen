class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message
      })),
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with the same unique value already exists.',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(error.details ? { errors: error.details } : {}),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  AppError,
  catchAsync,
  globalErrorHandler
};
