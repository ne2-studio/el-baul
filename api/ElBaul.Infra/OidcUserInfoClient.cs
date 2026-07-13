using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra;

public class OidcUserInfoClient(HttpClient httpClient, IConfiguration configuration, ILogger<OidcUserInfoClient> logger)
    : IUserInfoClient
{
    public async Task<UserInfo?> GetUserInfoAsync(string accessToken)
    {
        var endpoint = configuration["Auth:UserInfoEndpoint"];
        if (string.IsNullOrEmpty(endpoint))
        {
            logger.LogWarning("Auth:UserInfoEndpoint is not configured; cannot resolve email/name for new user");
            return null;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Userinfo endpoint returned {StatusCode}", response.StatusCode);
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<UserInfoResponse>();
            if (payload?.Email is null)
            {
                logger.LogWarning("Userinfo endpoint response did not include an email claim");
                return null;
            }

            return new UserInfo(payload.Email, payload.Name);
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Failed to call userinfo endpoint");
            return null;
        }
    }

    private record UserInfoResponse(
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name);
}
