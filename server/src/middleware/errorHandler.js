const { logger } = require('../utils/logger');

/**
 * Central error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Get request ID from request (set by requestId middleware)
  const requestId = req.id || 'unknown';
  
  // Log the error with request details
  logger.error({
    message: `Error processing request: ${err.message}`,
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
    status: err.statusCode || 500
  });

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Error response based on environment
  const errorResponse = {
    error: message,
    requestId,
    status: statusCode
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Request ID middleware
 * Assigns a unique ID to each request
 */
const requestId = (req, res, next) => {
  const uuid = require('uuid').v4();
  req.id = uuid;
  res.setHeader('X-Request-ID', uuid);
  next();
};

/**
 * Not found middleware
 * Handles 404 errors for routes that don't exist
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Async handler to avoid try/catch in route handlers
 * @param {Function} fn - Async route handler
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  AppError,
  requestId,
  notFound,
  asyncHandler
};