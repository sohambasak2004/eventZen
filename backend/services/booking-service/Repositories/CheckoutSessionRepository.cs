using EventZen.BookingService.Configuration;
using EventZen.BookingService.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace EventZen.BookingService.Repositories;

public sealed class CheckoutSessionRepository : ICheckoutSessionRepository
{
    private readonly IMongoCollection<CheckoutSession> _collection;

    public CheckoutSessionRepository(IMongoDatabase database, IOptions<BookingDatabaseSettings> options)
    {
        _collection = database.GetCollection<CheckoutSession>(options.Value.CheckoutSessionsCollectionName);
    }

    public Task CreateAsync(CheckoutSession session, CancellationToken cancellationToken) =>
        _collection.InsertOneAsync(session, cancellationToken: cancellationToken);

    public async Task<CheckoutSession?> GetByCheckoutSessionIdAsync(string checkoutSessionId, CancellationToken cancellationToken) =>
        await _collection.Find(item => item.CheckoutSessionId == checkoutSessionId)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<CheckoutSession?> GetReusablePendingSessionAsync(string userId, string eventId, DateTimeOffset now, CancellationToken cancellationToken) =>
        await _collection.Find(item =>
                item.User.UserId == userId &&
                item.Event.EventId == eventId &&
                item.Status == "pending_payment" &&
                item.ExpiresAt >= now)
            .SortByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public Task UpdateAsync(CheckoutSession session, CancellationToken cancellationToken) =>
        _collection.ReplaceOneAsync(item => item.CheckoutSessionId == session.CheckoutSessionId, session, cancellationToken: cancellationToken);

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken cancellationToken)
    {
        var result = await _collection.DeleteManyAsync(item => item.Event.EventId == eventId, cancellationToken);
        return result.DeletedCount;
    }
}
