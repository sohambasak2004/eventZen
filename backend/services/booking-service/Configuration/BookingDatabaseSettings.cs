namespace EventZen.BookingService.Configuration;

public sealed class BookingDatabaseSettings
{
    public const string SectionName = "BookingDatabase";

    public string ConnectionString { get; init; } = "mongodb://localhost:27017";

    public string DatabaseName { get; init; } = "eventzen_booking";

    public string BookingsCollectionName { get; init; } = "bookings";

    public string CheckoutSessionsCollectionName { get; init; } = "checkout_sessions";
}
