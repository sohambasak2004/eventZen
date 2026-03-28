# EventZen Venue & Vendor Service - Postman Collection

This directory contains Postman collections and environments for testing the EventZen Venue & Vendor Management Service.

## Files

- `EventZen-Venue-Vendor-Service.postman_collection.json` - Main API collection
- `EventZen-Venue-Vendor-Development.postman_environment.json` - Development environment
- `EventZen-Venue-Vendor-Production.postman_environment.json` - Production environment

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Import the collection file: `EventZen-Venue-Vendor-Service.postman_collection.json`
4. Import the environment file: `EventZen-Venue-Vendor-Development.postman_environment.json`
5. Select the "EventZen Venue & Vendor - Development" environment in the top-right dropdown

### 2. Configure JWT Tokens

Before running authenticated requests, you need valid JWT tokens from the EventZen Auth Service:

1. **Get Admin Token**: Login to the EventZen auth service with an admin account
2. **Get Organizer Token**: Login with an organizer account
3. **Update Environment Variables**:
   - `admin_token`: Replace with actual admin JWT token
   - `organizer_token`: Replace with actual organizer JWT token

Example: In Postman environment variables, replace:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.REPLACE_WITH_ACTUAL_ADMIN_TOKEN
```

with your actual token from the auth service.

### 3. Start the Service

Ensure the Venue & Vendor service is running:

```bash
# Navigate to service directory
cd backend/services/venue-vendor-service

# Start MongoDB (if using Docker Compose)
docker-compose up -d

# Start the service
npm run dev
```

Verify the service is running by checking the health endpoint:

```
GET http://localhost:3001/health
```

## Collection Structure

### Health & Info

- **Health Check**: Verify service is running
- **API Info**: Get service information and available endpoints

### Venues

- **Create Venue**: Create a new venue (Admin only)
- **Get All Venues**: List venues with filtering (Public)
- **Get Venue by ID**: Get specific venue details (Public)
- **Check Venue Availability**: Check if venue is available for dates
- **Create Venue Booking**: Book a venue for an event (Organizer+)
- **Update Venue**: Modify venue details (Admin/Owner)
- **Search Venues by Location**: Geographic search
- **Search Venues by Text**: Text-based search
- **Get Venue Bookings**: View all bookings for a venue (Admin)
- **Get Venue Stats**: View venue statistics (Admin/Owner)

### Vendors

- **Create Vendor**: Register a new vendor (Admin only)
- **Get All Vendors**: List vendors with filtering
- **Get Vendor by ID**: Get specific vendor details
- **Get Vendors by Service Type**: Filter by service category
- **Check Vendor Availability**: Check vendor availability for dates
- **Hire Vendor (Create Contract)**: Create a vendor contract (Organizer+)
- **Add Vendor Review**: Submit vendor review
- **Update Vendor**: Modify vendor details (Admin/Owner)
- **Update Vendor Verification**: Change verification status (Admin)
- **Search Vendors by Location**: Geographic search for vendors
- **Search Vendors by Text**: Text-based vendor search

### Bookings

- **Get All Bookings**: List user's bookings (or all if Admin)
- **Get Booking by ID**: Get specific booking details
- **Update Booking Status**: Change booking status (Admin)
- **Add Payment to Booking**: Record payment for booking
- **Cancel Booking**: Cancel an existing booking
- **Get Booking Statistics**: View booking analytics (Admin)
- **Check Booking Conflicts**: Detect scheduling conflicts (Admin)

### Contracts

- **Get All Contracts**: List user's contracts (or all if Admin)
- **Get Contract by ID**: Get specific contract details
- **Update Contract Status**: Change contract status (Admin)
- **Add Payment to Contract**: Record contract payment
- **Add Performance Rating**: Rate vendor performance
- **Cancel Contract**: Cancel an existing contract
- **Get Contract Statistics**: View contract analytics (Admin)
- **Check Schedule Conflicts**: Detect vendor scheduling conflicts (Admin)

## Testing Workflow

### 1. Basic Functionality Test

Run these requests in order to test basic functionality:

1. **Health Check** - Verify service is running
2. **Get All Venues** - Test public venue listing
3. **Create Venue** (with admin token) - Create test venue
4. **Get Venue by ID** - Retrieve the created venue
5. **Create Vendor** (with admin token) - Create test vendor
6. **Get Vendor by ID** - Retrieve the created vendor

### 2. Booking Flow Test

Test the complete booking workflow:

1. **Check Venue Availability** - Verify venue is available
2. **Create Venue Booking** (with organizer token) - Book the venue
3. **Get Booking by ID** - Retrieve booking details
4. **Add Payment to Booking** - Add payment record
5. **Update Booking Status** (with admin token) - Confirm booking

### 3. Contract Flow Test

Test the complete vendor hiring workflow:

1. **Check Vendor Availability** - Verify vendor is available
2. **Hire Vendor** (with organizer token) - Create contract
3. **Get Contract by ID** - Retrieve contract details
4. **Update Contract Status** (with admin token) - Sign contract
5. **Add Payment to Contract** - Add payment record
6. **Add Performance Rating** - Rate vendor after service

### 4. Search and Filter Tests

1. **Search Venues by Location** - Test geospatial search
2. **Search Venues by Text** - Test text search
3. **Search Vendors by Location** - Test vendor geo-search
4. **Get Vendors by Service Type** - Test service filtering

### 5. Admin Function Tests

1. **Get Booking Statistics** - Test analytics endpoints
2. **Get Contract Statistics** - Test contract analytics
3. **Check Booking Conflicts** - Test conflict detection
4. **Check Schedule Conflicts** - Test vendor scheduling

## Environment Variables

The collection uses these environment variables:

- `base_url`: Service URL (default: http://localhost:3001)
- `admin_token`: JWT token for admin user
- `organizer_token`: JWT token for organizer user
- `venue_id`: Auto-set when creating a venue
- `vendor_id`: Auto-set when creating a vendor
- `booking_id`: Auto-set when creating a booking
- `contract_id`: Auto-set when creating a contract
- `event_id`: Test event ID

## Authentication

Most endpoints require JWT authentication:

### Public Endpoints (No Authentication Required)

- GET /health
- GET /api/v1
- GET /venues (listing)
- GET /venues/:id (details)
- GET /venues/search/\*

### Protected Endpoints (JWT Required)

- All vendor endpoints
- Venue availability and booking
- All booking and contract management

### Admin-Only Endpoints (Admin JWT Required)

- POST, PUT, DELETE for venues
- POST, DELETE for vendors
- Status updates for bookings/contracts
- Statistics and analytics endpoints

## Error Testing

The collection includes examples for testing error scenarios:

1. **401 Unauthorized**: Try accessing protected endpoints without tokens
2. **403 Forbidden**: Try admin endpoints with organizer token
3. **404 Not Found**: Try accessing non-existent resources
4. **409 Conflict**: Try creating conflicting bookings
5. **400 Bad Request**: Send invalid data in requests

## Tips

1. **Auto-Assignment**: Many requests automatically set environment variables for use in subsequent requests
2. **Token Management**: Copy fresh tokens from the auth service when they expire
3. **Data Dependencies**: Some requests depend on data from previous requests (e.g., booking a venue requires a venue ID)
4. **Cleanup**: After testing, you may want to delete test data to avoid conflicts

## Production Usage

For production testing:

1. Import the production environment file
2. Update the `base_url` to your production API URL
3. Use production JWT tokens
4. Be cautious with data creation/deletion operations

## Support

For issues with the Postman collection:

1. Verify the service is running and healthy
2. Check that JWT tokens are valid and not expired
3. Ensure you're using the correct environment
4. Review the API documentation for endpoint requirements
