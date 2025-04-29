# Book Translation App

A production-ready application for translating books into different languages without using GPT or human translators.

![Book Translation Dashboard](https://i.imgur.com/example-screenshot.png)

## Features

- **Multiple Translation Services**: Integrates with DeepL, Microsoft Translator, Amazon Translate, Argos Translate (offline), and LibreTranslate
- **Document Format Support**: Handles PDF, EPUB, TXT, and DOCX files
- **User-Friendly Interface**: Simple step-by-step process for uploading, configuring, and translating books
- **Background Processing**: Handles large documents efficiently with progress tracking
- **Secure Authentication**: User accounts with email verification and secure password management
- **Translation History**: Track and manage past translations with easy access to translated files

## Technology Stack

### Frontend
- React.js
- Tailwind CSS
- Lucide React (icons)
- Recharts (data visualization)
- Axios (API communication)

### Backend
- Node.js
- Express.js
- MongoDB (database)
- Redis (caching and job queue)
- Bull (job queue)
- JWT (authentication)

### Translation Services
- DeepL API
- Microsoft Translator API
- Amazon Translate
- Argos Translate (offline)
- LibreTranslate (self-hosted)

### Document Processing
- PDF.js for PDF parsing
- Mammoth.js for DOCX processing
- EPUB.js for EPUB handling
- Custom text processing utilities

## System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│  MongoDB    │
│  (React)    │     │  (Express)  │     │ (Database)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
         ┌─────────────────┬─────────────────┐
         │                 │                 │
┌────────▼─────┐   ┌───────▼────────┐  ┌─────▼─────┐
│ Redis Queue  │   │ File Processing │  │ Translation│
│ (Background) │   │    Service      │  │  Services  │
└──────────────┘   └────────────────┘  └─────────────┘
```

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB
- Redis
- Docker and Docker Compose (for production deployment)
- API keys for translation services:
  - DeepL
  - Microsoft Translator
  - Amazon Translate

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/book-translation-app.git
   cd book-translation-app
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the server directory:
   ```
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/translation-app
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1d

   # Translation API Keys
   DEEPL_API_KEY=your_deepl_api_key
   MS_TRANSLATOR_KEY=your_microsoft_translator_key
   MS_TRANSLATOR_REGION=global
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   LIBRE_TRANSLATE_API_URL=http://localhost:5500

   # Email Configuration
   EMAIL_FROM_NAME=Book Translation App
   EMAIL_FROM_ADDRESS=noreply@example.com
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USERNAME=your_mailtrap_username
   EMAIL_PASSWORD=your_mailtrap_password

   # Frontend URL (for email links)
   FRONTEND_URL=http://localhost:3000
   ```

   Create a `.env` file in the client directory:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Create required directories**
   ```bash
   cd ../server
   mkdir -p uploads translations/temp translations/completed logs
   ```

5. **Start development servers**
   ```bash
   # Start server (in server directory)
   npm run dev

   # Start client (in client directory)
   cd ../client
   npm start
   ```

### Using Docker for Development

Alternatively, use Docker Compose to start all services:

```bash
docker-compose up
```

This will start:
- MongoDB database
- Redis for caching and queue
- LibreTranslate local instance
- Backend API server
- Frontend React application

## Production Deployment

For production deployment, follow these steps:

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Configure production environment variables**
   
   Update `.env` files with production settings.

3. **Start with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

See the [Deployment Guide](./docs/deployment-guide.md) for detailed instructions.

## Usage Guide

### Translating a Book

1. **Sign in or register** a new account
2. **Upload your book** (PDF, EPUB, TXT, or DOCX format)
3. **Configure translation settings**:
   - Select source language
   - Select target language
   - Choose translation service
4. **Start translation** and monitor progress
5. **Download** the translated book when complete

### Managing Translations

- View your translation history
- Download previously translated books
- Delete unwanted translations
- Track translation progress

## API Documentation

The API is organized around REST principles. It accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes.

### Base URL
```
https://your-domain.com/api
```

### Authentication
Most endpoints require JWT authentication:
```
Authorization: Bearer your_jwt_token
```

### Endpoints

#### Authentication
- `POST /users/register` - Register a new user
- `POST /users/login` - Login a user
- `GET /users/verify/:token` - Verify email address
- `POST /users/forgot-password` - Request password reset
- `POST /users/reset-password/:token` - Reset password

#### Translations
- `POST /translations` - Start a new translation
- `GET /translations` - List all translations
- `GET /translations/:id` - Get translation status
- `GET /translations/:id/download` - Download translated file
- `DELETE /translations/:id/cancel` - Cancel translation
- `DELETE /translations/:id` - Delete translation

For complete API documentation, see [API Reference](./docs/api-reference.md).

## Security Features

The application implements numerous security measures:

- **Authentication**: JWT-based with secure token management
- **Password Security**: Bcrypt hashing with salt
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse through configurable rate limits
- **CSRF Protection**: Token-based protection for forms
- **XSS Prevention**: Content Security Policy and input sanitization
- **Secure Headers**: HTTP security headers via Helmet.js
- **Access Control**: Role-based permissions system

## Error Handling

The application uses a centralized error handling system:

- **Request Tracking**: Unique ID for each request for tracing
- **Structured Logging**: Winston logger with different severity levels
- **Consistent Responses**: Standardized error format across the API
- **User-Friendly Messages**: Clear error messages for frontend display

## Translation Service Details

### DeepL Translator
- High-quality translations for 26+ languages
- API requires authentication key
- Character-based pricing model

### Microsoft Translator
- Supports 100+ languages
- Azure-based service with API key
- Character-based pricing model

### Amazon Translate
- AWS service supporting 75+ languages
- Requires AWS credentials
- Pay-per-character pricing

### Argos Translate
- Offline translation without internet access
- Open-source, free to use
- Limited language pairs but no API restrictions

### LibreTranslate
- Self-hosted open-source translation API
- No external API dependencies
- Limited accuracy but completely free

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

The application includes comprehensive testing:

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

Test coverage includes:
- Unit tests for individual components
- Integration tests for API endpoints
- End-to-end tests for critical user flows

## Performance Optimization

The application is optimized for performance:

- **Document Chunking**: Large documents are processed in chunks
- **Background Processing**: Heavy tasks handled by worker processes
- **Caching**: Redis caching for frequent operations
- **Database Indexing**: Optimized MongoDB queries
- **Compressed Responses**: gzip/deflate compression for API responses

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [DeepL API](https://www.deepl.com/docs-api) for high-quality translation
- [Microsoft Translator](https://www.microsoft.com/en-us/translator/) for wide language support
- [Amazon Translate](https://aws.amazon.com/translate/) for reliable translation services
- [Argos Translate](https://github.com/argosopentech/argos-translate) for offline translation capabilities
- [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) for open-source translation
- [React](https://reactjs.org/) for the frontend framework
- [Express](https://expressjs.com/) for the backend framework
- [MongoDB](https://www.mongodb.com/) for the database
- [Bull](https://github.com/OptimalBits/bull) for the job queue

## Contact

Project Link: [https://github.com/your-username/book-translation-app](https://github.com/your-username/book-translation-app)

---

<p align="center">
  Made with ❤️ for book lovers around the world
</p>