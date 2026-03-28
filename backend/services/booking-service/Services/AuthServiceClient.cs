using System.Net.Http.Headers;
using System.Text.Json;
using EventZen.BookingService.Configuration;
using EventZen.BookingService.Contracts;
using Microsoft.Extensions.Options;

namespace EventZen.BookingService.Services;

public sealed class AuthServiceClient : IAuthServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ServiceEndpoints _serviceEndpoints;

    public AuthServiceClient(HttpClient httpClient, IOptions<ServiceEndpoints> options)
    {
        _httpClient = httpClient;
        _serviceEndpoints = options.Value;
    }

    public async Task<AuthenticatedUserProfile> GetCurrentUserAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_serviceEndpoints.AuthServiceBaseUrl}/me");
        request.Headers.Authorization = BuildAuthorizationHeader(httpContext);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Unable to load the current user from auth-service.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<AuthServiceMeResponse>(stream, JsonOptions.Default, cancellationToken);
        if (payload is null || string.IsNullOrWhiteSpace(payload.UserId))
        {
            throw new InvalidOperationException("auth-service returned an invalid user payload.");
        }

        return new AuthenticatedUserProfile(
            payload.UserId,
            payload.FirstName ?? string.Empty,
            payload.LastName ?? string.Empty,
            payload.Email ?? string.Empty,
            payload.Phone ?? string.Empty);
    }

    private static AuthenticationHeaderValue BuildAuthorizationHeader(HttpContext httpContext)
    {
        var rawHeader = httpContext.Request.Headers.Authorization.ToString();
        var token = rawHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? rawHeader["Bearer ".Length..]
            : rawHeader;

        return new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed record AuthServiceMeResponse(
        string UserId,
        string? FirstName,
        string? LastName,
        string? Email,
        string? Phone);
}
