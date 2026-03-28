namespace EventZen.BookingService.Contracts;

public sealed record CreateCheckoutSessionRequest(string EventId);

public sealed record ConfirmPaymentRequest(string? PaymentMethod = null);

public sealed record CheckoutSessionResponse(
    string CheckoutSessionId,
    string Status,
    decimal Amount,
    string Currency,
    DateTimeOffset ExpiresAt,
    BuyerDto Buyer,
    EventSummaryDto Event,
    DummyRazorpayCheckoutDto PaymentWindow);

public sealed record DummyRazorpayCheckoutDto(
    string Provider,
    string MerchantName,
    string CheckoutTitle,
    string PaymentReference,
    string PaymentMethod,
    string Notes);

public sealed record BuyerDto(
    string UserId,
    string Name,
    string Email,
    string Phone);

public sealed record EventSummaryDto(
    string EventId,
    string Title,
    string Location,
    string Date,
    string Time,
    decimal Amount,
    string Currency);

public sealed record BookingListResponse(IReadOnlyCollection<BookingResponse> Items);

public sealed record BookingResponse(
    string BookingId,
    string BookingStatus,
    BuyerDto User,
    EventSummaryDto Event,
    PaymentResponse Payment,
    TicketResponse Ticket,
    DateTimeOffset CreatedAt);

public sealed record PaymentResponse(
    string Provider,
    string Status,
    string PaymentId,
    string OrderId,
    decimal Amount,
    string Currency,
    DateTimeOffset PaidAt);

public sealed record TicketResponse(
    string TicketId,
    string TicketCode,
    string DownloadFileName,
    DateTimeOffset IssuedAt,
    string DownloadUrl);

public sealed record ConfirmPaymentResponse(
    string Message,
    BookingResponse Booking);

public sealed record TicketDownloadPayload(byte[] Content, string FileName, string ContentType);

public sealed record AuthenticatedUserProfile(
    string UserId,
    string FirstName,
    string LastName,
    string Email,
    string Phone)
{
    public string FullName => $"{FirstName} {LastName}".Trim();
}

public sealed record EventServiceResponse(
    string EventId,
    string Title,
    string Location,
    string Date,
    string Time,
    int Capacity,
    int Attendees,
    decimal Budget,
    decimal TicketPrice);
