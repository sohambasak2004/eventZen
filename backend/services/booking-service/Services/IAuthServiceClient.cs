using EventZen.BookingService.Contracts;

namespace EventZen.BookingService.Services;

public interface IAuthServiceClient
{
    Task<AuthenticatedUserProfile> GetCurrentUserAsync(HttpContext httpContext, CancellationToken cancellationToken);
}
