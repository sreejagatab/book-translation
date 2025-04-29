# Book Translation App Integration Guide

This document outlines how all the components of the Book Translation App integrate and work together.

## System Architecture Overview

The Book Translation App follows a microservices architecture with the following main components:

1. **Client Application**: React frontend
2. **API Server**: Node.js/Express backend
3. **Database**: MongoDB for persistent storage
4. **Queue System**: Redis + Bull for handling translation jobs
5. **Translation Services**: Integration with multiple translation APIs
6. **File Processing Service**: Handles document parsing and conversion

## Component Integration

### 1. Frontend to Backend Integration

The React frontend communicates with the backend through a RESTful API:

```
Client (React) <---> API Server (Express) <---> MongoDB
                         |
                         ↓
                 Translation Services
```

Key integration points:
- API service (`client/src/services/api.js`) handles all API requests
- JWT authentication for secure communication
- File uploads using multipart/form-data

### 2. Job Queue System

Long-running translation tasks are handled through a job queue:

```
API Server <---> Redis Queue <---> Worker Processes
                                       |
                                       ↓
                               Translation Services
```

Key integration points:
- `queueService.js` manages job creation and monitoring
- Bull queue with Redis backend for reliable job processing
- Job progress updates via database and WebSocket notifications

### 3. Translation Service Integration

The application integrates with multiple translation services:

```
Translation Service
      |
      ↓
+-----------------+
| DeepL           |
| Microsoft       |
| Amazon          |
| Argos (offline) |
| LibreTranslate  |
+-----------------+
```

Key integration points:
- Common interface for all translation services
- Automatic fallback mechanisms
- Service-specific language code mapping
- Error handling and retry logic

### 4. File Processing Workflow

```
┌─────────────┐     ┌────────────┐     ┌──────────────┐     ┌─────────────┐
│ File Upload │ --> │ Text       │ --> │ Translation  │ --> │ Output      │
│             │     │ Extraction │     │ Processing   │     │ Generation  │
└─────────────┘     └────────────┘     └──────────────┘     └─────────────┘
```

## Integration Points Description

### API Endpoints

The backend exposes the following RESTful API endpoints:

#### Authentication Routes
- `POST /api/users/register`: Register a new user
- `POST /api/users/login`: Login a user
- `GET /api/users/verify/:token`: Verify user account
- `POST /api/users/forgot-password`: Request password reset
- `PATCH /api/users/reset-password/:token`: Reset password

#### Translation Routes
- `POST /api/translations`: Start new translation job
- `GET /api/translations/:id`: Get translation status
- `GET /api/translations/:id/download`: Download translated file
- `DELETE /api/translations/:id/cancel`: Cancel translation
- `DELETE /api/translations/:id`: Delete translation
- `GET /api/translations`: Get all user translations

### Database Schema Relationships

```
┌─────────────┐       ┌─────────────────┐
│ User        │       │ Translation      │
│             │       │                  │
│ _id         │───┐   │ _id             │
│ name        │   │   │ userId          │────┐
│ email       │   │   │ originalFileName│    │
│ password    │   │   │ fileFormat      │    │ References
└─────────────┘   │   │ sourceLanguage  │    │ User._id
                  │   │ targetLanguage  │    │
                  │   │ service         │    │
                  │   │ status          │    │
                  │   │ progress        │    │
                  └───│ totalChunks     │    │
                      │ processedChunks │    │
                      │ translatedFile  │<───┘
                      └─────────────────┘
```

### Security Integration

The app implements multiple layers of security:

1. **Authentication**: JWT-based authentication system
2. **Authorization**: Role-based access control
3. **Input Validation**: Request validation and sanitization
4. **Rate Limiting**: API rate limiting for all endpoints
5. **CORS Protection**: Configurable cross-origin resource sharing
6. **Security Headers**: Helmet for setting HTTP security headers
7. **CSRF Protection**: CSRF token validation for sensitive operations

### Error Handling Integration

The application uses a centralized error handling system:

1. **Request ID Tracking**: Every request has a unique ID for tracing
2. **Structured Logging**: Winston logger with proper log levels
3. **Custom Error Classes**: AppError class for predictable error handling
4. **Async Handler**: Wrapper for async route handlers to avoid try/catch blocks
5. **Global Error Handler**: Centralized middleware for error formatting

## Environment Variables

The following environment variables must be configured for proper integration:

```
# Server Configuration
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://mongo:27017/translation-app
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_USERNAME=your_sendgrid_username
SENDGRID_PASSWORD=your_sendgrid_password
EMAIL_FROM_NAME=Book Translation App
EMAIL_FROM_ADDRESS=no-reply@example.com

# Translation API Keys
DEEPL_API_KEY=your_deepl_api_key
MS_TRANSLATOR_KEY=your_microsoft_translator_key
MS_TRANSLATOR_REGION=global
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
LIBRE_TRANSLATE_API_URL=http://libretranslate:5000

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Integration Testing

To ensure all components work together correctly, execute the following integration tests:

1. **Authentication Flow**: Test user registration, login, and authentication
2. **Translation Job Flow**: Test uploading, translating, and downloading files
3. **Error Handling**: Test error responses and logging
4. **Concurrency**: Test multiple simultaneous translation jobs
5. **Service Failover**: Test fallback between translation services

Run the integration tests with:

```bash
npm run test:integration
```

## Health Monitoring

The application exposes health check endpoints:

- `GET /health`: Basic health check endpoint
- `GET /health/database`: MongoDB connection health
- `GET /health/redis`: Redis connection health
- `GET /health/services`: Translation services availability

Monitor these endpoints regularly to ensure system health.

## Deployment Integration

For deployment, all components should be orchestrated with Docker Compose:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This will start all necessary services with proper network configuration.

## Troubleshooting Integration Issues

Common integration issues and solutions:

1. **Authentication Failures**: Check JWT token expiration and secret key
2. **Database Connection Issues**: Verify MongoDB connection string and network access
3. **Queue Processing Failures**: Check Redis connection and queue processing logs
4. **API Rate Limiting**: Look for 429 status codes and adjust rate limits
5. **File Processing Errors**: Check file format support and processing logs

Consult the log files for detailed error information:
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`