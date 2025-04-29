const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { AppError } = require('./errorHandler');
const sanitize = require('sanitize-html');

/**
 * Configure security middleware
 * @param {Object} app - Express app instance
 */
const configureSecurityMiddleware = (app) => {
  // Helmet helps secure Express apps by setting HTTP headers
  app.use(helmet());
  
  // Content Security Policy (CSP)
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for React in development
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
  );
  
  // Configure CORS
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests from allowed origins
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        // Add more allowed origins here
      ];
      
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new AppError('Not allowed by CORS', 403));
      }
    },
    credentials: true, // Allow credentials (cookies, auth headers)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // How long preflight requests can be cached (in seconds)
  };
  
  app.use(cors(corsOptions));
  
  // CSRF protection
  const csrf = require('csurf');
  const csrfProtection = csrf({ 
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  });
  
  // Only add CSRF protection to routes that need it
  app.use('/api/users', csrfProtection);
  app.use('/api/translations', csrfProtection);
  
  // Generate CSRF token
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  
  // Add request ID middleware
  app.use((req, res, next) => {
    const id = uuidv4();
    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
  });
  
  // Add security headers
  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Disable cache for sensitive routes
    if (req.path.includes('/api/users')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    next();
  });
};

/**
 * Sanitize request inputs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeInputs = (req, res, next) => {
  try {
    // Skip sanitization for file uploads
    if (req.is('multipart/form-data')) {
      return next();
    }
    
    // Sanitize request body
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitize(req.body[key], {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
      }
    }
    
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitize(req.query[key], {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
      }
    }
    
    // Sanitize URL parameters
    if (req.params) {
      for (const key in req.params) {
        if (typeof req.params[key] === 'string') {
          req.params[key] = sanitize(req.params[key], {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(new AppError('Invalid input', 400));
  }
};

/**
 * Validate content type middleware
 * Ensures requests have appropriate content types
 */
const validateContentType = (req, res, next) => {
  // Skip for GET and DELETE requests
  if (['GET', 'DELETE'].includes(req.method)) {
    return next();
  }
  
  // Skip for options requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Check content type header
  const contentType = req.headers['content-type'];
  
  if (!contentType) {
    return next(new AppError('Content-Type header is required', 400));
  }
  
  // Allow JSON, form data, and URL encoded
  const validContentTypes = [
    'application/json',
    'multipart/form-data',
    'application/x-www-form-urlencoded'
  ];
  
  // Check if content type starts with any valid type (for multipart boundaries)
  const isValid = validContentTypes.some(type => contentType.startsWith(type));
  
  if (!isValid) {
    return next(new AppError('Invalid Content-Type', 415));
  }
  
  next();
};

/**
 * Prevent parameter pollution
 * Cleans up query parameters to prevent attacks
 */
const preventParameterPollution = (req, res, next) => {
  // Get whitelist for specific routes
  let whitelist = [];
  
  if (req.path.includes('/api/translations')) {
    whitelist = ['sort', 'limit', 'page', 'fields', 'status'];
  } else if (req.path.includes('/api/users')) {
    whitelist = ['role', 'active', 'sort', 'limit', 'page'];
  }
  
  // Clean query parameters
  if (req.query) {
    const cleanQuery = {};
    
    // Handle whitelisted parameters to allow arrays
    for (const param of whitelist) {
      if (req.query[param]) {
        cleanQuery[param] = req.query[param];
      }
    }
    
    // Handle other parameters (keep only the last value)
    for (const param in req.query) {
      if (!whitelist.includes(param)) {
        cleanQuery[param] = Array.isArray(req.query[param])
          ? req.query[param][req.query[param].length - 1]
          : req.query[param];
      }
    }
    
    req.query = cleanQuery;
  }
  
  next();
};

module.exports = {
  configureSecurityMiddleware,
  sanitizeInputs,
  validateContentType,
  preventParameterPollution
};