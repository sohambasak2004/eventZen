using EventZen.BookingService.Configuration;
using EventZen.BookingService.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace EventZen.BookingService.Repositories;

public sealed class BookingRepository : IBookingRepository
{
    private readonly IMongoCollection<BookingRecord> _collection;

    public BookingRepository(IMongoDatabase database, IOptions<BookingDatabaseSettings> options)
    {
        _collection = database.GetCollection<BookingRecord>(options.Value.BookingsCollectionName);
    }

    public Task CreateAsync(BookingRecord booking, CancellationToken cancellationToken) =>
        _collection.InsertOneAsync(booking, cancellationToken: cancellationToken);

    public async Task<BookingRecord?> GetByBookingIdAsync(string bookingId, CancellationToken cancellationToken) =>
        await _collection.Find(item => item.BookingId == bookingId).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyCollection<BookingRecord>> GetByUserIdAsync(string userId, CancellationToken cancellationToken) =>
        await _collection.Find(item => item.User.UserId == userId)
            .SortByDescending(item => item.Payment.PaidAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyCollection<BookingRecord>> GetRecentPaidAsync(int limit, CancellationToken cancellationToken) =>
        await _collection.Find(item => item.Payment.Status == "paid")
            .SortByDescending(item => item.Payment.PaidAt)
            .Limit(Math.Max(limit, 1))
            .ToListAsync(cancellationToken);

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken cancellationToken)
    {
        var result = await _collection.DeleteManyAsync(item => item.Event.EventId == eventId, cancellationToken);
        return result.DeletedCount;
    }
}
