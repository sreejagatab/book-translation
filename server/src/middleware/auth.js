const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./errorHandler');
const { logger } = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // 1) Get token from headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Check if token exists
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 3) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 4) Check if user still exists
  const user = await User.findById(decoded.id).select('+password');
  if (!user) {
    return next(new AppError('The user associated with this token no longer exists.', 401));
  }

  // 5) Check if user is active
  if (!user.active) {
    return next(new AppError('This user account has been deactivated.', 401));
  }

  // 6) Check if user is verified (if required)
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
    return next(new AppError('Please verify your email address to access this resource.', 403));
  }

  // 7) Attach user to request
  req.user = user;
  next();
});

/**
 * Authorization middleware
 * Restricts access to specific roles
 * @param  {...String} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (authenticate middleware should run first)
    if (!req.user) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // Check if user's role is allowed
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * Generate and send JWT token response
 * @param {Object} user - User object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user);

  // Remove password from output
  user.password = undefined;

  // Send response
  res.status(statusCode).json({
    status: 'success',
    token,
    user
  });
};

module.exports = {
  authenticate,
  authorize,
  generateToken,
  sendTokenResponse
};