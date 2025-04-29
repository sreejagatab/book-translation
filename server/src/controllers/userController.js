const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { sendTokenResponse } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

/**
 * User controller methods
 */
const userController = {
  /**
   * Register a new user
   * @route POST /api/users/register
   * @access Public
   */
  register: asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already in use', 409));
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate verification token if email verification is required
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      // Create verification token
      const verificationToken = user.createAccountVerificationToken();
      await user.save({ validateBeforeSave: false });

      // Create verification URL
      const verificationURL = `${process.env.FRONTEND_URL}/verify-account/${verificationToken}`;

      // Send verification email
      await sendEmail({
        email: user.email,
        subject: 'Account Verification',
        message: `Please verify your account by clicking the following link: ${verificationURL}
                 \nThe link expires in 24 hours.`
      });

      // Send response
      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully. Please check your email to verify your account.'
      });
    }

    // If email verification is not required, send token
    sendTokenResponse(user, 201, res);
  }),

  /**
   * Login user
   * @route POST /api/users/login
   * @access Public
   */
  login: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // Check if user is active
    if (!user.active) {
      return next(new AppError('Your account has been deactivated', 401));
    }

    // Check if user is verified (if required)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      return next(new AppError('Please verify your email address to log in', 403));
    }

    // Send token response
    sendTokenResponse(user, 200, res);
  }),

  /**
   * Verify user account
   * @route GET /api/users/verify/:token
   * @access Public
   */
  verifyAccount: asyncHandler(async (req, res, next) => {
    // Get token from params
    const { token } = req.params;

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by token
    const user = await User.findOne({
      accountVerificationToken: hashedToken,
      accountVerificationExpires: { $gt: Date.now() }
    });

    // Check if user exists
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Update user
    user.isVerified = true;
    user.accountVerificationToken = undefined;
    user.accountVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Account verified successfully',
      redirectUrl: `${process.env.FRONTEND_URL}/login`
    });
  }),

  /**
   * Forgot password
   * @route POST /api/users/forgot-password
   * @access Public
   */
  forgotPassword: asyncHandler(async (req, res, next) => {
    // Get user by email
    const user = await User.findOne({ email: req.body.email });

    // Check if user exists
    if (!user) {
      return next(new AppError('There is no user with that email address', 404));
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      // Send reset email
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message: `You are receiving this email because you (or someone else) has requested the reset of a password. 
                 \nPlease click the following link to reset your password: ${resetURL}
                 \nThe link expires in 10 minutes.`
      });

      // Send response
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email'
      });
    } catch (err) {
      // Reset token fields and save
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error('Error sending password reset email:', err);
      return next(new AppError('There was an error sending the email. Try again later.', 500));
    }
  }),

  /**
   * Reset password
   * @route PATCH /api/users/reset-password/:token
   * @access Public
   */
  resetPassword: asyncHandler(async (req, res, next) => {
    // Get token from params
    const { token } = req.params;

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // Check if user exists
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    // Update password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send response
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
      redirectUrl: `${process.env.FRONTEND_URL}/login`
    });
  }),

  /**
   * Get current user profile
   * @route GET /api/users/profile
   * @access Private
   */
  getProfile: asyncHandler(async (req, res, next) => {
    // Get user with translations count
    const user = await User.findById(req.user.id).populate('translations');

    // Send response
    res.status(200).json({
      status: 'success',
      user
    });
  }),

  /**
   * Update user profile
   * @route PATCH /api/users/profile
   * @access Private
   */
  updateProfile: asyncHandler(async (req, res, next) => {
    // Fields to update
    const fieldsToUpdate = {
      name: req.body.name
    };

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    // Send response
    res.status(200).json({
      status: 'success',
      user
    });
  }),

  /**
   * Update password
   * @route PATCH /api/users/update-password
   * @access Private
   */
  updatePassword: asyncHandler(async (req, res, next) => {
    // Get current password
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send new token
    sendTokenResponse(user, 200, res);
  }),

  /**
   * Deactivate account
   * @route DELETE /api/users/deactivate
   * @access Private
   */
  deactivateAccount: asyncHandler(async (req, res, next) => {
    // Deactivate user
    await User.findByIdAndUpdate(req.user.id, { active: false });

    // Send response
    res.status(204).json({
      status: 'success',
      data: null
    });
  })
};

module.exports = userController;