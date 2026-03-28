using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using EventZen.BookingService.Configuration;
using EventZen.BookingService.Contracts;
using Microsoft.Extensions.Options;

namespace EventZen.BookingService.Services;

public sealed class EventServiceClient : IEventServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ServiceEndpoints _serviceEndpoints;

    public EventServiceClient(HttpClient httpClient, IOptions<ServiceEndpoints> options)
    {
        _httpClient = httpClient;
        _serviceEndpoints = options.Value;
    }

    public async Task<EventServiceResponse> GetEventByIdAsync(string eventId, HttpContext httpContext, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_serviceEndpoints.EventServiceBaseUrl}/events/{eventId}");
        request.Headers.Authorization = BuildAuthorizationHeader(httpContext);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Unable to load the selected event from event-service.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<EventEnvelope>(stream, JsonOptions.Default, cancellationToken);
        var eventPayload = payload?.Data?.Event;
        var eventIdValue = eventPayload?.EventId ?? eventPayload?.Id;
        if (eventPayload is null || string.IsNullOrWhiteSpace(eventIdValue))
        {
            throw new InvalidOperationException("event-service returned an invalid event payload.");
        }

        return new EventServiceResponse(
            eventIdValue,
            eventPayload.Title ?? "Event",
            eventPayload.Location ?? "Location to be announced",
            eventPayload.Date ?? string.Empty,
            eventPayload.Time ?? string.Empty,
            eventPayload.Capacity ?? 0,
            eventPayload.Attendees ?? 0,
            Convert.ToDecimal(eventPayload.Budget ?? 0m),
            Convert.ToDecimal(eventPayload.TicketPrice ?? 0m));
    }

    public async Task UpdateAttendeeCountAsync(string eventId, int attendeeCount, HttpContext httpContext, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"{_serviceEndpoints.EventServiceBaseUrl}/events/{eventId}/attendees");
        request.Headers.Authorization = BuildAuthorizationHeader(httpContext);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { count = attendeeCount }),
            Encoding.UTF8,
            "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Unable to update event attendance in event-service.");
        }
    }

    private static AuthenticationHeaderValue BuildAuthorizationHeader(HttpContext httpContext)
    {
        var rawHeader = httpContext.Request.Headers.Authorization.ToString();
        var token = rawHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? rawHeader["Bearer ".Length..]
            : rawHeader;

        return new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed record EventEnvelope(EventEnvelopeData? Data);
    private sealed record EventEnvelopeData(EventPayload? Event);
    private sealed record EventPayload(
        string? Id,
        string? EventId,
        string? Title,
        string? Location,
        string? Date,
        string? Time,
        int? Capacity,
        int? Attendees,
        decimal? Budget,
        decimal? TicketPrice);
}
