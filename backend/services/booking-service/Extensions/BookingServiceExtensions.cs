using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using EventZen.BookingService.Configuration;
using EventZen.BookingService.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

namespace EventZen.BookingService.Extensions;

public static class BookingServiceExtensions
{
    public const string DefaultCorsPolicy = "booking-service-cors";

    public static IServiceCollection AddBookingInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IMongoDatabase>(serviceProvider =>
        {
            var dbSettings = serviceProvider.GetRequiredService<IOptions<BookingDatabaseSettings>>().Value;
            var client = new MongoClient(dbSettings.ConnectionString);
            return client.GetDatabase(dbSettings.DatabaseName);
        });

        services.AddHttpClient();
        services.AddCors(options =>
        {
            var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            options.AddPolicy(DefaultCorsPolicy, policy =>
            {
                policy.WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        return services;
    }

    public static IServiceCollection AddBookingAuthentication(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var publicKeyPath = configuration["Jwt:PublicKeyPath"] ?? "../auth-service/public.pem";
        var resolvedPublicKeyPath = ResolvePublicKeyPath(publicKeyPath, environment.ContentRootPath);
        var publicKeyPem = File.ReadAllText(resolvedPublicKeyPath);
        using var rsa = RSA.Create();
        rsa.ImportFromPem(publicKeyPem);
        var rsaKey = new RsaSecurityKey(rsa.ExportParameters(false));

        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = rsaKey,
                    NameClaimType = ClaimTypes.NameIdentifier,
                    RoleClaimType = ClaimTypes.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        if (context.Principal?.Identity is not ClaimsIdentity identity)
                        {
                            return Task.CompletedTask;
                        }

                        var userId = identity.FindFirst("sub")?.Value ?? identity.FindFirst("userId")?.Value;
                        if (!string.IsNullOrWhiteSpace(userId) &&
                            !identity.HasClaim(claim => claim.Type == ClaimTypes.NameIdentifier))
                        {
                            identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, userId));
                        }

                        foreach (var roleValue in identity.FindAll("roles").Select(claim => claim.Value))
                        {
                            foreach (var role in roleValue.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                            {
                                if (!identity.HasClaim(ClaimTypes.Role, role))
                                {
                                    identity.AddClaim(new Claim(ClaimTypes.Role, role));
                                }
                            }
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }

    private static string ResolvePublicKeyPath(string configuredPath, string contentRootPath)
    {
        var candidates = new[]
        {
            Path.GetFullPath(Path.Combine(contentRootPath, configuredPath)),
            Path.GetFullPath(Path.Combine(contentRootPath, "../auth-service/public.pem")),
            Path.GetFullPath(Path.Combine(contentRootPath, "../../services/auth-service/public.pem")),
            Path.GetFullPath(Path.Combine(contentRootPath, "../../shared/keys/public.pem"))
        };

        var resolvedPath = candidates.FirstOrDefault(File.Exists);
        if (resolvedPath is not null)
        {
            return resolvedPath;
        }

        throw new FileNotFoundException(
            $"JWT public key file was not found. Checked: {string.Join(", ", candidates)}",
            candidates[0]);
    }

    public static async Task InitializeBookingIndexesAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var dbSettings = scope.ServiceProvider.GetRequiredService<IOptions<BookingDatabaseSettings>>().Value;

        var bookings = database.GetCollection<BookingRecord>(dbSettings.BookingsCollectionName);
        await bookings.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<BookingRecord>(
                Builders<BookingRecord>.IndexKeys.Ascending(item => item.BookingId),
                new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<BookingRecord>(
                Builders<BookingRecord>.IndexKeys.Ascending("user.userId").Descending("payment.paidAt")),
            new CreateIndexModel<BookingRecord>(
                Builders<BookingRecord>.IndexKeys.Ascending("event.eventId").Descending("payment.paidAt"))
        });

        var sessions = database.GetCollection<CheckoutSession>(dbSettings.CheckoutSessionsCollectionName);
        await sessions.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<CheckoutSession>(
                Builders<CheckoutSession>.IndexKeys.Ascending(item => item.CheckoutSessionId),
                new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<CheckoutSession>(
                Builders<CheckoutSession>.IndexKeys.Ascending("user.userId").Descending("createdAt"))
        });
    }
}
