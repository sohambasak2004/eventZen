using EventZen.BookingService.Contracts;

namespace EventZen.BookingService.Services;

public interface IEventServiceClient
{
    Task<EventServiceResponse> GetEventByIdAsync(string eventId, HttpContext httpContext, CancellationToken cancellationToken);

    Task UpdateAttendeeCountAsync(string eventId, int attendeeCount, HttpContext httpContext, CancellationToken cancellationToken);
}
