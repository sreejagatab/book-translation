const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Authentication routes (with rate limiting)
router.post('/register', authLimiter, userController.register);
router.post('/login', authLimiter, userController.login);
router.get('/verify/:token', userController.verifyAccount);
router.post('/forgot-password', authLimiter, userController.forgotPassword);
router.patch('/reset-password/:token', authLimiter, userController.resetPassword);

// Protected routes (require authentication)
router.get('/profile', authenticate, userController.getProfile);
router.patch('/profile', authenticate, userController.updateProfile);
router.patch('/update-password', authenticate, authLimiter, userController.updatePassword);
router.delete('/deactivate', authenticate, userController.deactivateAccount);

// Admin routes
router.get(
  '/admin/users',
  authenticate,
  authorize('admin'),
  userController.getUsers
);

module.exports = router;