namespace EventZen.BookingService.Configuration;

public sealed class ServiceEndpoints
{
    public const string SectionName = "ServiceEndpoints";

    public string AuthServiceBaseUrl { get; init; } = "http://localhost:8081/api/v1/auth";

    public string EventServiceBaseUrl { get; init; } = "http://localhost:3002/api/v1";

    public string FrontendBaseUrl { get; init; } = "http://localhost:5173";
}
