# EventZen Booking Service

ASP.NET Core booking service for attendee checkout, dummy Razorpay-style payment confirmation, ticket generation, and MongoDB persistence.

## Default Runtime

- Service URL: `http://localhost:8082`
- Frontend URL: `http://localhost:5173`
- Auth service URL: `http://localhost:8081/api/v1/auth`
- Event service URL: `http://localhost:3002/api/v1`
- MongoDB database: `eventzen_booking`

## MongoDB Collections

### `bookings`

Stores every successful booking and the details requested in the scenario.

```json
{
  "_id": "ObjectId",
  "bookingId": "bk_...",
  "checkoutSessionId": "cs_...",
  "user": {
    "userId": "usr_123",
    "name": "Soham Das",
    "email": "soham@example.com",
    "phone": "+91-90000-00000"
  },
  "event": {
    "eventId": "evt_123",
    "title": "Frontend Futures Summit",
    "location": "Kolkata Tech Park",
    "date": "2026-04-12",
    "time": "10:00",
    "amount": 499,
    "currency": "INR"
  },
  "payment": {
    "provider": "dummy_razorpay_cash",
    "status": "paid",
    "paymentId": "pay_...",
    "orderId": "order_...",
    "amount": 499,
    "currency": "INR",
    "paidAt": "2026-03-23T11:12:13Z"
  },
  "ticket": {
    "ticketId": "tkt_...",
    "ticketCode": "EZ-EVEN-USER-123456",
    "downloadFileName": "frontend-futures-summit-EZ-EVEN-USER-123456.pdf",
    "issuedAt": "2026-03-23T11:12:13Z"
  },
  "bookingStatus": "confirmed",
  "createdAt": "2026-03-23T11:12:13Z",
  "updatedAt": "2026-03-23T11:12:13Z"
}
```

### `checkout_sessions`

Stores short-lived payment sessions created when a user opens the booking popup.

```json
{
  "_id": "ObjectId",
  "checkoutSessionId": "cs_...",
  "user": {
    "userId": "usr_123",
    "name": "Soham Das",
    "email": "soham@example.com",
    "phone": "+91-90000-00000"
  },
  "event": {
    "eventId": "evt_123",
    "title": "Frontend Futures Summit",
    "location": "Kolkata Tech Park",
    "date": "2026-04-12",
    "time": "10:00",
    "amount": 499,
    "currency": "INR"
  },
  "amount": 499,
  "currency": "INR",
  "status": "pending_payment",
  "paymentProvider": "dummy_razorpay_cash",
  "paymentReference": "payref_...",
  "expiresAt": "2026-03-23T11:32:13Z",
  "createdAt": "2026-03-23T11:12:13Z",
  "updatedAt": "2026-03-23T11:12:13Z"
}
```

## Environment Variables

- `BookingDatabase__ConnectionString`
- `BookingDatabase__DatabaseName`
- `BookingDatabase__BookingsCollectionName`
- `BookingDatabase__CheckoutSessionsCollectionName`
- `ServiceEndpoints__AuthServiceBaseUrl`
- `ServiceEndpoints__EventServiceBaseUrl`
- `ServiceEndpoints__FrontendBaseUrl`
- `Jwt__PublicKeyPath`
- `Cors__AllowedOrigins__0`
- `ASPNETCORE_URLS`

## Restarting Locally

If `dotnet run` says `http://127.0.0.1:8082` is already in use, an older booking-service process is still running.

Use the included restart script to free the port and start cleanly:

```powershell
.\scripts\restart-service.ps1
```

If you want to run the service on a different port for one session:

```powershell
$env:ASPNETCORE_URLS="http://localhost:8084"
dotnet run
```

## Notes

- The payment window is intentionally a dummy Razorpay-style experience for local development.
- Ticket downloads are returned as `.pdf` files after payment confirmation.
- Successful bookings store user name, booked event, payment status, and paid timestamp in MongoDB.
- Ticket price is derived from the event data because the existing event service does not currently expose a dedicated ticket price field.
