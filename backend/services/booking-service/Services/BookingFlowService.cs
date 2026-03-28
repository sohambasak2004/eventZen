using System.Security.Claims;
using EventZen.BookingService.Configuration;
using EventZen.BookingService.Contracts;
using EventZen.BookingService.Models;
using EventZen.BookingService.Repositories;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace EventZen.BookingService.Services;

public sealed class BookingFlowService : IBookingFlowService
{
    private readonly ICheckoutSessionRepository _checkoutSessionRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IAuthServiceClient _authServiceClient;
    private readonly IEventServiceClient _eventServiceClient;
    private readonly ITicketPdfBuilder _ticketPdfBuilder;
    private readonly ServiceEndpoints _serviceEndpoints;
    private readonly IMemoryCache _memoryCache;

    public BookingFlowService(
        ICheckoutSessionRepository checkoutSessionRepository,
        IBookingRepository bookingRepository,
        IAuthServiceClient authServiceClient,
        IEventServiceClient eventServiceClient,
        ITicketPdfBuilder ticketPdfBuilder,
        IMemoryCache memoryCache,
        IOptions<ServiceEndpoints> serviceEndpoints)
    {
        _checkoutSessionRepository = checkoutSessionRepository;
        _bookingRepository = bookingRepository;
        _authServiceClient = authServiceClient;
        _eventServiceClient = eventServiceClient;
        _ticketPdfBuilder = ticketPdfBuilder;
        _memoryCache = memoryCache;
        _serviceEndpoints = serviceEndpoints.Value;
    }

    public async Task<CheckoutSessionResponse> CreateCheckoutSessionAsync(CreateCheckoutSessionRequest request, HttpContext httpContext, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.EventId))
        {
            throw new InvalidOperationException("An event id is required to create a checkout session.");
        }

        var user = await _authServiceClient.GetCurrentUserAsync(httpContext, cancellationToken);
        var eventData = await _eventServiceClient.GetEventByIdAsync(request.EventId, httpContext, cancellationToken);
        var amount = ResolveTicketAmount(eventData);

        if (eventData.Capacity > 0 && eventData.Attendees >= eventData.Capacity)
        {
            throw new InvalidOperationException("This event is already sold out.");
        }

        var now = DateTimeOffset.UtcNow;
        var existingSession = await _checkoutSessionRepository.GetReusablePendingSessionAsync(user.UserId, request.EventId, now, cancellationToken);
        if (existingSession is not null)
        {
            if (existingSession.Amount != amount || existingSession.Event.Amount != amount)
            {
                existingSession.Amount = amount;
                existingSession.Event.Amount = amount;
                existingSession.Event.Title = eventData.Title;
                existingSession.Event.Location = eventData.Location;
                existingSession.Event.Date = eventData.Date;
                existingSession.Event.Time = eventData.Time;
                existingSession.UpdatedAt = now;
                await _checkoutSessionRepository.UpdateAsync(existingSession, cancellationToken);
            }

            CachePendingSession(existingSession);
            return ToCheckoutSessionResponse(existingSession);
        }

        var session = new CheckoutSession
        {
            CheckoutSessionId = $"cs_{Guid.NewGuid():N}",
            PaymentReference = $"payref_{Guid.NewGuid():N}",
            User = new BookingUserSnapshot
            {
                UserId = user.UserId,
                Name = user.FullName,
                Email = user.Email,
                Phone = user.Phone
            },
            Event = new BookingEventSnapshot
            {
                EventId = eventData.EventId,
                Title = eventData.Title,
                Location = eventData.Location,
                Date = eventData.Date,
                Time = eventData.Time,
                Amount = amount,
                Currency = "INR"
            },
            Amount = amount,
            Currency = "INR",
            ExpiresAt = now.AddMinutes(20),
            CreatedAt = now,
            UpdatedAt = now
        };

        await _checkoutSessionRepository.CreateAsync(session, cancellationToken);
        CachePendingSession(session);
        return ToCheckoutSessionResponse(session);
    }

    public async Task<ConfirmPaymentResponse> ConfirmPaymentAsync(string sessionId, ConfirmPaymentRequest request, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId(httpContext);

        var existing = await _bookingRepository.GetByUserIdAsync(currentUserId, cancellationToken);
        var existingBooking = existing.FirstOrDefault(item => item.CheckoutSessionId == sessionId);
        if (existingBooking is not null)
        {
            return new ConfirmPaymentResponse("Payment was already completed.", ToBookingResponse(existingBooking));
        }

        var persistedSession = await _checkoutSessionRepository.GetByCheckoutSessionIdAsync(sessionId, cancellationToken);
        var session = GetCachedPendingSession(sessionId) ?? persistedSession
            ?? throw new InvalidOperationException("Checkout session not found.");

        if (!string.Equals(session.User.UserId, currentUserId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("You cannot confirm a payment for another user.");
        }

        if (session.ExpiresAt < DateTimeOffset.UtcNow)
        {
            RemoveCachedPendingSession(sessionId);
            throw new InvalidOperationException("This checkout session has expired.");
        }

        if (string.Equals(session.Status, "paid", StringComparison.OrdinalIgnoreCase))
        {
            var found = existing.FirstOrDefault(item => item.CheckoutSessionId == session.CheckoutSessionId);
            if (found is null)
            {
                throw new InvalidOperationException("Payment was already confirmed, but booking lookup failed.");
            }

            return new ConfirmPaymentResponse("Payment was already completed.", ToBookingResponse(found));
        }

        var eventData = await _eventServiceClient.GetEventByIdAsync(session.Event.EventId, httpContext, cancellationToken);
        if (eventData.Capacity > 0 && eventData.Attendees + 1 > eventData.Capacity)
        {
            throw new InvalidOperationException("This event became sold out before payment completed.");
        }

        var paymentTimestamp = DateTimeOffset.UtcNow;
        var ticketCode = GenerateTicketCode(session.Event.EventId, session.User.UserId);
        var booking = new BookingRecord
        {
            BookingId = $"bk_{Guid.NewGuid():N}",
            CheckoutSessionId = session.CheckoutSessionId,
            User = session.User,
            Event = session.Event,
            Payment = new PaymentDetails
            {
                Provider = request.PaymentMethod ?? session.PaymentProvider,
                Status = "paid",
                PaymentId = $"pay_{Guid.NewGuid():N}",
                OrderId = $"order_{Guid.NewGuid():N}",
                Amount = session.Amount,
                Currency = session.Currency,
                PaidAt = paymentTimestamp
            },
            Ticket = new TicketDetails
            {
                TicketId = $"tkt_{Guid.NewGuid():N}",
                TicketCode = ticketCode,
                DownloadFileName = $"{Slugify(session.Event.Title)}-{ticketCode}.pdf",
                IssuedAt = paymentTimestamp
            },
            BookingStatus = "confirmed",
            CreatedAt = paymentTimestamp,
            UpdatedAt = paymentTimestamp
        };

        session.Status = "paid";
        session.UpdatedAt = paymentTimestamp;

        await _bookingRepository.CreateAsync(booking, cancellationToken);
        if (persistedSession is null)
        {
            await _checkoutSessionRepository.CreateAsync(session, cancellationToken);
        }
        else
        {
            await _checkoutSessionRepository.UpdateAsync(session, cancellationToken);
        }

        RemoveCachedPendingSession(sessionId);

        return new ConfirmPaymentResponse("Payment successful and ticket generated.", ToBookingResponse(booking));
    }

    public async Task<BookingListResponse> GetBookingsForCurrentUserAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId(httpContext);
        var bookings = await _bookingRepository.GetByUserIdAsync(userId, cancellationToken);
        return new BookingListResponse(bookings.Select(ToBookingResponse).ToArray());
    }

    public async Task<BookingResponse?> GetBookingAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId(httpContext);
        var booking = await _bookingRepository.GetByBookingIdAsync(bookingId, cancellationToken);
        return booking is null || booking.User.UserId != userId ? null : ToBookingResponse(booking);
    }

    public async Task<TicketResponse?> GetTicketAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId(httpContext);
        var booking = await _bookingRepository.GetByBookingIdAsync(bookingId, cancellationToken);
        return booking is null || booking.User.UserId != userId ? null : ToTicketResponse(booking);
    }

    public async Task<TicketDownloadPayload?> BuildTicketDownloadAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId(httpContext);
        var booking = await _bookingRepository.GetByBookingIdAsync(bookingId, cancellationToken);
        if (booking is null || booking.User.UserId != userId)
        {
            return null;
        }

        var fileName = EnsurePdfFileName(booking.Ticket.DownloadFileName, booking.Event.Title, booking.Ticket.TicketCode);
        var content = _ticketPdfBuilder.Build(booking);
        return new TicketDownloadPayload(content, fileName, "application/pdf");
    }

    private CheckoutSessionResponse ToCheckoutSessionResponse(CheckoutSession session) =>
        new(
            session.CheckoutSessionId,
            session.Status,
            session.Amount,
            session.Currency,
            session.ExpiresAt,
            new BuyerDto(session.User.UserId, session.User.Name, session.User.Email, session.User.Phone),
            new EventSummaryDto(session.Event.EventId, session.Event.Title, session.Event.Location, session.Event.Date, session.Event.Time, session.Event.Amount, session.Event.Currency),
            new DummyRazorpayCheckoutDto(
                session.PaymentProvider,
                "EventZen",
                "Dummy Razorpay Cash Checkout",
                session.PaymentReference,
                "cash",
                "This is a safe dummy payment window for local development."));

    private BookingResponse ToBookingResponse(BookingRecord booking) =>
        new(
            booking.BookingId,
            booking.BookingStatus,
            new BuyerDto(booking.User.UserId, booking.User.Name, booking.User.Email, booking.User.Phone),
            new EventSummaryDto(booking.Event.EventId, booking.Event.Title, booking.Event.Location, booking.Event.Date, booking.Event.Time, booking.Event.Amount, booking.Event.Currency),
            new PaymentResponse(booking.Payment.Provider, booking.Payment.Status, booking.Payment.PaymentId, booking.Payment.OrderId, booking.Payment.Amount, booking.Payment.Currency, booking.Payment.PaidAt),
            ToTicketResponse(booking),
            booking.CreatedAt);

    private TicketResponse ToTicketResponse(BookingRecord booking) =>
        new(
            booking.Ticket.TicketId,
            booking.Ticket.TicketCode,
            EnsurePdfFileName(booking.Ticket.DownloadFileName, booking.Event.Title, booking.Ticket.TicketCode),
            booking.Ticket.IssuedAt,
            $"{_serviceEndpoints.FrontendBaseUrl.TrimEnd('/')}/bookings/{booking.BookingId}/ticket");

    private static string EnsurePdfFileName(string? fileName, string eventTitle, string ticketCode)
    {
        if (!string.IsNullOrWhiteSpace(fileName))
        {
            var extension = Path.GetExtension(fileName);
            if (string.Equals(extension, ".pdf", StringComparison.OrdinalIgnoreCase))
            {
                return fileName;
            }

            var baseName = Path.GetFileNameWithoutExtension(fileName);
            if (!string.IsNullOrWhiteSpace(baseName))
            {
                return $"{baseName}.pdf";
            }
        }

        return $"{Slugify(eventTitle)}-{ticketCode}.pdf";
    }

    private void CachePendingSession(CheckoutSession session) =>
        _memoryCache.Set(GetPendingSessionCacheKey(session.CheckoutSessionId), session, session.ExpiresAt);

    private CheckoutSession? GetCachedPendingSession(string sessionId) =>
        _memoryCache.Get<CheckoutSession>(GetPendingSessionCacheKey(sessionId));

    private void RemoveCachedPendingSession(string sessionId) =>
        _memoryCache.Remove(GetPendingSessionCacheKey(sessionId));

    private static string GetPendingSessionCacheKey(string sessionId) =>
        $"booking:checkout-session:{sessionId}";

    private static decimal ResolveTicketAmount(EventServiceResponse eventData)
    {
        return Math.Max(eventData.TicketPrice, 0m);
    }

    private static string GetCurrentUserId(HttpContext httpContext) =>
        httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? httpContext.User.FindFirstValue("sub")
        ?? throw new InvalidOperationException("Authenticated user id is missing from the token.");

    private static string GenerateTicketCode(string eventId, string userId)
    {
        var eventPart = new string(eventId.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpperInvariant().PadRight(4, 'X');
        var userPart = new string(userId.Where(char.IsLetterOrDigit).Take(4).ToArray()).ToUpperInvariant().PadRight(4, 'X');
        var randomPart = Random.Shared.Next(100000, 999999);
        return $"EZ-{eventPart}-{userPart}-{randomPart}";
    }

    private static string Slugify(string value)
    {
        var slug = new string(value.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-');
        while (slug.Contains("--", StringComparison.Ordinal))
        {
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        }

        return string.IsNullOrWhiteSpace(slug) ? "eventzen-ticket" : slug;
    }
}
