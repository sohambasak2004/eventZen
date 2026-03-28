using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EventZen.BookingService.Models;

public sealed class BookingRecord
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("bookingId")]
    public string BookingId { get; set; } = $"bk_{Guid.NewGuid():N}";

    [BsonElement("checkoutSessionId")]
    public string CheckoutSessionId { get; set; } = string.Empty;

    [BsonElement("user")]
    public BookingUserSnapshot User { get; set; } = new();

    [BsonElement("event")]
    public BookingEventSnapshot Event { get; set; } = new();

    [BsonElement("payment")]
    public PaymentDetails Payment { get; set; } = new();

    [BsonElement("ticket")]
    public TicketDetails Ticket { get; set; } = new();

    [BsonElement("bookingStatus")]
    public string BookingStatus { get; set; } = "confirmed";

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class CheckoutSession
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("checkoutSessionId")]
    public string CheckoutSessionId { get; set; } = $"cs_{Guid.NewGuid():N}";

    [BsonElement("user")]
    public BookingUserSnapshot User { get; set; } = new();

    [BsonElement("event")]
    public BookingEventSnapshot Event { get; set; } = new();

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "INR";

    [BsonElement("status")]
    public string Status { get; set; } = "pending_payment";

    [BsonElement("paymentProvider")]
    public string PaymentProvider { get; set; } = "dummy_razorpay_cash";

    [BsonElement("paymentReference")]
    public string PaymentReference { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddMinutes(20);

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class BookingUserSnapshot
{
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;
}

public sealed class BookingEventSnapshot
{
    [BsonElement("eventId")]
    public string EventId { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("location")]
    public string Location { get; set; } = string.Empty;

    [BsonElement("date")]
    public string Date { get; set; } = string.Empty;

    [BsonElement("time")]
    public string Time { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "INR";
}

public sealed class PaymentDetails
{
    [BsonElement("provider")]
    public string Provider { get; set; } = "dummy_razorpay_cash";

    [BsonElement("status")]
    public string Status { get; set; } = "paid";

    [BsonElement("paymentId")]
    public string PaymentId { get; set; } = string.Empty;

    [BsonElement("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "INR";

    [BsonElement("paidAt")]
    public DateTimeOffset PaidAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class TicketDetails
{
    [BsonElement("ticketId")]
    public string TicketId { get; set; } = $"tkt_{Guid.NewGuid():N}";

    [BsonElement("ticketCode")]
    public string TicketCode { get; set; } = string.Empty;

    [BsonElement("downloadFileName")]
    public string DownloadFileName { get; set; } = "eventzen-ticket.pdf";

    [BsonElement("issuedAt")]
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
}
