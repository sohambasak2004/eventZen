# EventZen Venue & Vendor Management Service

A microservice for managing venues, vendors, bookings, and contracts in the EventZen platform.

## 🚀 Features

- **Venue Management**: CRUD operations, availability checking, geospatial search
- **Vendor Management**: Service provider onboarding, verification, contract management
- **Booking System**: Venue reservations with conflict detection and payment tracking
- **Contract Management**: Vendor contracts with performance tracking and ratings
- **Authentication**: JWT-based authentication with role-based access control
- **Search & Filtering**: Advanced search by location, price, rating, and more
- **Real-time Validation**: Comprehensive input validation and error handling

## 🏗️ Architecture

- **Framework**: Node.js + Express.js
- **Database**: MongoDB 7.0 with Mongoose ODM
- **Authentication**: JWT with RSA keys (shared with auth service)
- **Documentation**: OpenAPI/Swagger (planned)
- **Testing**: Jest + Supertest
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+ or Docker for containerized MongoDB
- EventZen Auth Service (for JWT public key)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd backend/services/venue-vendor-service
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/eventzen_venue_vendor

# JWT Configuration (ensure path to auth service keys is correct)
JWT_PUBLIC_KEY_PATH=../auth-service/public.pem
JWT_ALGORITHM=RS256

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Start MongoDB

#### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will start:

- MongoDB on port 27017
- Mongo Express (web UI) on port 8087

#### Option B: Local MongoDB Installation

Ensure MongoDB is running on `localhost:27017`

### 4. Start the Service

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The service will be available at `http://localhost:3001`

## 📚 API Documentation

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Venue Endpoints

#### Public Endpoints

- `GET /venues` - List venues (with filters)
- `GET /venues/:id` - Get venue details
- `GET /venues/search` - Text search venues
- `GET /venues/search/location` - Location-based search

#### Protected Endpoints

- `GET /venues/:id/availability` - Check availability
- `POST /venues/:id/book` - Create booking (Organizer+)
- `POST /venues` - Create venue (Admin)
- `PUT /venues/:id` - Update venue (Admin/Owner)
- `DELETE /venues/:id` - Delete venue (Admin)
- `GET /venues/:id/bookings` - Get venue bookings (Admin)
- `GET /venues/:id/stats` - Get venue statistics (Admin/Owner)

### Vendor Endpoints

#### Protected Endpoints (All require authentication)

- `GET /vendors` - List vendors
- `GET /vendors/:id` - Get vendor details
- `GET /vendors/service/:serviceType` - Get vendors by service type
- `GET /vendors/search` - Text search vendors
- `GET /vendors/search/location` - Location-based search
- `GET /vendors/:id/availability` - Check vendor availability
- `POST /vendors/:id/hire` - Create contract (Organizer+)
- `POST /vendors/:id/reviews` - Add review
- `POST /vendors` - Create vendor (Admin)
- `PUT /vendors/:id` - Update vendor (Admin/Owner)
- `DELETE /vendors/:id` - Delete vendor (Admin)
- `PATCH /vendors/:id/verification` - Update verification (Admin)

### Booking Endpoints

#### Protected Endpoints

- `GET /bookings` - List bookings (filtered by role)
- `GET /bookings/:id` - Get booking details (Owner/Admin)
- `POST /bookings/:id/payments` - Add payment (Owner/Admin)
- `DELETE /bookings/:id` - Cancel booking (Owner/Admin)
- `PATCH /bookings/:id/status` - Update status (Admin)
- `GET /bookings/stats` - Get statistics (Admin)
- `GET /bookings/conflicts` - Check conflicts (Admin)

### Contract Endpoints

#### Protected Endpoints

- `GET /contracts` - List contracts (filtered by role)
- `GET /contracts/:id` - Get contract details (Owner/Vendor/Admin)
- `POST /contracts/:id/payments` - Add payment (Owner/Admin)
- `POST /contracts/:id/rating` - Add performance rating (Owner/Admin)
- `DELETE /contracts/:id` - Cancel contract (Owner/Admin)
- `PATCH /contracts/:id/status` - Update status (Admin)
- `GET /contracts/stats` - Get statistics (Admin)
- `GET /contracts/conflicts` - Check schedule conflicts (Admin)

## 🔧 Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Management

#### Accessing MongoDB

- **Mongo Express**: http://localhost:8087 (admin/admin123)
- **MongoDB Shell**: `docker exec -it eventzen-mongodb mongosh`

#### Sample Data

To load sample data for development, set `INIT_SAMPLE_DATA=true` in your MongoDB init script environment.

## 🚦 Health Check

Check service health:

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "status": "ok",
  "service": "venue-vendor-service",
  "timestamp": "2024-03-21T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development",
  "database": "connected"
}
```

## 🔐 Role-Based Access Control

### Roles

- **Admin**: Full access to all resources
- **Organizer**: Can create bookings and contracts, manage own resources
- **Vendor**: Can manage own vendor profile (planned)
- **Client**: Basic read access (planned)

### Permission Matrix

| Endpoint               | Public | Organizer | Admin | Notes                   |
| ---------------------- | ------ | --------- | ----- | ----------------------- |
| GET /venues            | ✅     | ✅        | ✅    | Public venue listing    |
| POST /venues           | ❌     | ❌        | ✅    | Admin only              |
| POST /venues/:id/book  | ❌     | ✅        | ✅    | Create bookings         |
| GET /vendors           | ❌     | ✅        | ✅    | Authentication required |
| POST /vendors/:id/hire | ❌     | ✅        | ✅    | Create contracts        |
| PATCH \*/status        | ❌     | ❌        | ✅    | Status management       |

## 🔍 Error Handling

The service uses standardized error responses:

```json
{
  "status": "error|fail",
  "message": "Human-readable error message",
  "errors": [...], // For validation errors
  "timestamp": "2024-03-21T10:30:00.000Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## 📊 Monitoring

### Logging

- Request/response logging with Morgan
- Error logging with stack traces
- User activity logging for non-GET requests

### Rate Limiting

- General API: 100 requests per 15 minutes
- Authenticated users: 200 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes

## 🚀 Deployment

### Docker

Build the service:

```bash
# From the venue-vendor-service directory
docker build -t eventzen/venue-vendor-service .
```

### Docker Compose (Production)

See `docker-compose.yml` for the complete setup including MongoDB.

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/eventzen_venue_vendor
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem
LOG_LEVEL=warn
```

## 🧪 Testing

### Test Structure

```
src/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── fixtures/       # Test data
└── helpers/        # Test utilities
```

### Test Commands

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation for API changes
4. Use meaningful commit messages
5. Ensure all tests pass before submitting

## 📝 License

Part of the EventZen project. Internal use only.

## 🆘 Troubleshooting

### Common Issues

1. **JWT Public Key Not Found**
   - Ensure the auth service is set up and the public key path is correct
   - Check file permissions on the shared keys directory

2. **MongoDB Connection Failed**
   - Verify MongoDB is running: `docker ps` or `mongosh`
   - Check the connection string in `.env`

3. **Port Already in Use**
   - Change the PORT in `.env` or stop the conflicting service

4. **Authentication Failures**
   - Verify JWT tokens from the auth service
   - Check that the public key matches the auth service

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for verbose logging.

### Support

For issues and questions, refer to the EventZen project documentation or contact the development team.
