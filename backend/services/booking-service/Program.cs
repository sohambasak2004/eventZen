using EventZen.BookingService.Configuration;
using EventZen.BookingService.Contracts;
using EventZen.BookingService.Extensions;
using EventZen.BookingService.Repositories;
using EventZen.BookingService.Services;
using Microsoft.AspNetCore.Connections;
using Microsoft.Extensions.Options;
using System.IO;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
var serviceUrl = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://localhost:8082";

builder.Configuration.AddEnvironmentVariables();
builder.WebHost.UseUrls(serviceUrl);
builder.Services.Configure<BookingDatabaseSettings>(builder.Configuration.GetSection(BookingDatabaseSettings.SectionName));
builder.Services.Configure<ServiceEndpoints>(builder.Configuration.GetSection(ServiceEndpoints.SectionName));

builder.Services.AddBookingAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddBookingInfrastructure(builder.Configuration);
builder.Services.AddMemoryCache();

builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<ICheckoutSessionRepository, CheckoutSessionRepository>();
builder.Services.AddHttpClient<IAuthServiceClient, AuthServiceClient>();
builder.Services.AddHttpClient<IEventServiceClient, EventServiceClient>();
builder.Services.AddScoped<ITicketPdfBuilder, TicketPdfBuilder>();
builder.Services.AddScoped<IBookingFlowService, BookingFlowService>();
builder.Services.AddAuthorization();

var app = builder.Build();
await app.Services.InitializeBookingIndexesAsync();

app.UseCors(BookingServiceExtensions.DefaultCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        context.Response.StatusCode = error is InvalidOperationException ? StatusCodes.Status400BadRequest : StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = error?.Message ?? "An unexpected error occurred." });
    });
});

app.MapGet("/health", (IOptions<BookingDatabaseSettings> dbOptions) => Results.Ok(new
{
    status = "OK",
    service = "booking-service",
    version = "1.0.0",
    database = dbOptions.Value.DatabaseName,
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapGet("/api/v1", () => Results.Ok(new
{
    service = "EventZen Booking Service",
    version = "v1.0.0",
    endpoints = new
    {
        checkoutSessions = "/api/v1/bookings/checkout-sessions",
        myBookings = "/api/v1/bookings/me",
        ticketDownload = "/api/v1/bookings/{bookingId}/ticket/download"
    },
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

var bookings = app.MapGroup("/api/v1/bookings").RequireAuthorization();
var adminBookings = app.MapGroup("/api/v1/admin/bookings").RequireAuthorization();

bookings.MapPost("/checkout-sessions", async (CreateCheckoutSessionRequest request, HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var result = await bookingFlowService.CreateCheckoutSessionAsync(request, httpContext, cancellationToken);
    return Results.Created($"/api/v1/bookings/checkout-sessions/{result.CheckoutSessionId}", result);
});

bookings.MapPost("/checkout-sessions/{sessionId}/confirm", async (string sessionId, ConfirmPaymentRequest request, HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var result = await bookingFlowService.ConfirmPaymentAsync(sessionId, request, httpContext, cancellationToken);
    return Results.Ok(result);
});

bookings.MapGet("/me", async (HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var result = await bookingFlowService.GetBookingsForCurrentUserAsync(httpContext, cancellationToken);
    return Results.Ok(result);
});

bookings.MapGet("/recent-paid", async (int? limit, HttpContext httpContext, IBookingRepository bookingRepository, CancellationToken cancellationToken) =>
{
    if (!IsAdmin(httpContext.User))
    {
        return Results.Forbid();
    }

    var recentBookings = await bookingRepository.GetRecentPaidAsync(limit ?? 10, cancellationToken);
    var items = recentBookings.Select(booking => new BookingResponse(
        booking.BookingId,
        booking.BookingStatus,
        new BuyerDto(booking.User.UserId, booking.User.Name, booking.User.Email, booking.User.Phone),
        new EventSummaryDto(booking.Event.EventId, booking.Event.Title, booking.Event.Location, booking.Event.Date, booking.Event.Time, booking.Event.Amount, booking.Event.Currency),
        new PaymentResponse(booking.Payment.Provider, booking.Payment.Status, booking.Payment.PaymentId, booking.Payment.OrderId, booking.Payment.Amount, booking.Payment.Currency, booking.Payment.PaidAt),
        new TicketResponse(
            booking.Ticket.TicketId,
            booking.Ticket.TicketCode,
            booking.Ticket.DownloadFileName,
            booking.Ticket.IssuedAt,
            string.Empty),
        booking.CreatedAt))
        .ToArray();

    return Results.Ok(new BookingListResponse(items));
});

adminBookings.MapGet("/recent-paid", async (int? limit, HttpContext httpContext, IBookingRepository bookingRepository, CancellationToken cancellationToken) =>
{
    if (!IsAdmin(httpContext.User))
    {
        return Results.Forbid();
    }

    var recentBookings = await bookingRepository.GetRecentPaidAsync(limit ?? 10, cancellationToken);
    var items = recentBookings.Select(booking => new BookingResponse(
        booking.BookingId,
        booking.BookingStatus,
        new BuyerDto(booking.User.UserId, booking.User.Name, booking.User.Email, booking.User.Phone),
        new EventSummaryDto(booking.Event.EventId, booking.Event.Title, booking.Event.Location, booking.Event.Date, booking.Event.Time, booking.Event.Amount, booking.Event.Currency),
        new PaymentResponse(booking.Payment.Provider, booking.Payment.Status, booking.Payment.PaymentId, booking.Payment.OrderId, booking.Payment.Amount, booking.Payment.Currency, booking.Payment.PaidAt),
        new TicketResponse(
            booking.Ticket.TicketId,
            booking.Ticket.TicketCode,
            booking.Ticket.DownloadFileName,
            booking.Ticket.IssuedAt,
            string.Empty),
        booking.CreatedAt))
        .ToArray();

    return Results.Ok(new BookingListResponse(items));
});

bookings.MapGet("/{bookingId}", async (string bookingId, HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var booking = await bookingFlowService.GetBookingAsync(bookingId, httpContext, cancellationToken);
    return booking is null ? Results.NotFound(new { message = "Booking not found." }) : Results.Ok(booking);
});

bookings.MapGet("/{bookingId}/ticket", async (string bookingId, HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var ticket = await bookingFlowService.GetTicketAsync(bookingId, httpContext, cancellationToken);
    return ticket is null ? Results.NotFound(new { message = "Ticket not found." }) : Results.Ok(ticket);
});

bookings.MapGet("/{bookingId}/ticket/download", async (string bookingId, HttpContext httpContext, IBookingFlowService bookingFlowService, CancellationToken cancellationToken) =>
{
    var ticketDownload = await bookingFlowService.BuildTicketDownloadAsync(bookingId, httpContext, cancellationToken);
    return ticketDownload is null
        ? Results.NotFound(new { message = "Ticket not found." })
        : Results.File(ticketDownload.Content, ticketDownload.ContentType, ticketDownload.FileName);
});

bookings.MapDelete("/events/{eventId}/cleanup", async (string eventId, HttpContext httpContext, IBookingRepository bookingRepository, ICheckoutSessionRepository checkoutSessionRepository, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(eventId))
    {
        return Results.BadRequest(new { message = "Event ID is required." });
    }

    var deletedBookings = await bookingRepository.DeleteByEventIdAsync(eventId, cancellationToken);
    var deletedCheckoutSessions = await checkoutSessionRepository.DeleteByEventIdAsync(eventId, cancellationToken);

    return Results.Ok(new
    {
        message = $"Cleanup completed for event {eventId}.",
        data = new
        {
            eventId,
            deletedCounts = new
            {
                bookings = deletedBookings,
                checkoutSessions = deletedCheckoutSessions
            },
            totalDeleted = deletedBookings + deletedCheckoutSessions
        }
    });
});

static bool IsAdmin(ClaimsPrincipal user) =>
    user.Claims.Any(claim =>
    {
        if (claim.Type != ClaimTypes.Role && claim.Type != "roles")
        {
            return false;
        }

        return claim.Value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(role => role.Trim().ToLowerInvariant())
            .Any(role => role == "admin" || role.EndsWith("_admin", StringComparison.Ordinal));
    });

try
{
    app.Run();
}
catch (IOException ex) when (ex.InnerException is AddressInUseException)
{
    app.Logger.LogError(ex, "Port binding failed. {ServiceUrl} is already in use.", serviceUrl);
    Console.Error.WriteLine($"Booking service could not start because {serviceUrl} is already in use.");
    Console.Error.WriteLine("Stop the existing process on that port, or run with a different port using ASPNETCORE_URLS.");
    Console.Error.WriteLine(@"Example: $env:ASPNETCORE_URLS=""http://localhost:8084""; dotnet run");
    Environment.ExitCode = 1;
}
