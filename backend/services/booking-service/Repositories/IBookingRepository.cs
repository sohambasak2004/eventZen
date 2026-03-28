using EventZen.BookingService.Models;

namespace EventZen.BookingService.Repositories;

public interface IBookingRepository
{
    Task CreateAsync(BookingRecord booking, CancellationToken cancellationToken);

    Task<BookingRecord?> GetByBookingIdAsync(string bookingId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BookingRecord>> GetByUserIdAsync(string userId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BookingRecord>> GetRecentPaidAsync(int limit, CancellationToken cancellationToken);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken cancellationToken);
}
