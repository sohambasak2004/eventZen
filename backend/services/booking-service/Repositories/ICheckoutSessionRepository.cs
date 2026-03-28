using EventZen.BookingService.Models;

namespace EventZen.BookingService.Repositories;

public interface ICheckoutSessionRepository
{
    Task CreateAsync(CheckoutSession session, CancellationToken cancellationToken);

    Task<CheckoutSession?> GetByCheckoutSessionIdAsync(string checkoutSessionId, CancellationToken cancellationToken);

    Task<CheckoutSession?> GetReusablePendingSessionAsync(string userId, string eventId, DateTimeOffset now, CancellationToken cancellationToken);

    Task UpdateAsync(CheckoutSession session, CancellationToken cancellationToken);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken cancellationToken);
}
