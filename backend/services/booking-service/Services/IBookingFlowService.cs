using EventZen.BookingService.Contracts;

namespace EventZen.BookingService.Services;

public interface IBookingFlowService
{
    Task<CheckoutSessionResponse> CreateCheckoutSessionAsync(CreateCheckoutSessionRequest request, HttpContext httpContext, CancellationToken cancellationToken);

    Task<ConfirmPaymentResponse> ConfirmPaymentAsync(string sessionId, ConfirmPaymentRequest request, HttpContext httpContext, CancellationToken cancellationToken);

    Task<BookingListResponse> GetBookingsForCurrentUserAsync(HttpContext httpContext, CancellationToken cancellationToken);

    Task<BookingResponse?> GetBookingAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken);

    Task<TicketResponse?> GetTicketAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken);

    Task<TicketDownloadPayload?> BuildTicketDownloadAsync(string bookingId, HttpContext httpContext, CancellationToken cancellationToken);
}
