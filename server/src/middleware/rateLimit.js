const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');
const { AppError } = require('./errorHandler');

// Create Redis client
let redisClient;

// Only create a redis client if REDIS_URL is provided
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
  
  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });
  
  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });
}

/**
 * Standard API rate limiter
 * Limits regular API requests
 */
const apiLimiter = rateLimit({
  // Use Redis store if available, otherwise use memory store
  store: process.env.REDIS_URL ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    throw new AppError('Too many requests, please try again later.', 429);
  }
});

/**
 * Authentication rate limiter
 * Stricter limits for authentication endpoints
 */
const authLimiter = rateLimit({
  store: process.env.REDIS_URL ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }) : undefined,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    throw new AppError('Too many login attempts, please try again later.', 429);
  }
});

/**
 * Upload rate limiter
 * Limits file upload requests
 */
const uploadLimiter = rateLimit({
  store: process.env.REDIS_URL ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }) : undefined,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    throw new AppError('Too many upload requests, please try again later.', 429);
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  redisClient
};