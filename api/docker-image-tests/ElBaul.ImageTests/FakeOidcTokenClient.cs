using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace ElBaul.ImageTests;

/// <summary>
/// Mints a real access token from the fake-oidc container over plain HTTP — no browser, no
/// Playwright. fake-oidc's own docs (github.com/ne2-studio/fake-oidc README, "How
/// authentication works") describe exactly this: GET /authorize/select?...&amp;user=&lt;key&gt;
/// issues an authorization code directly (that's what clicking a user button in the real
/// login screen submits), which POST /token then exchanges for tokens. PKCE is optional per
/// that same doc and is skipped here to keep this helper minimal — it isn't what's under
/// test.
///
/// Owns its own HttpClient (rather than reusing ElBaulImageFixture.FakeOidcClient) because it
/// needs auto-redirect-following turned off: /authorize/select's 302 points at
/// ElBaulImageFixture.OidcRedirectUri, an address that only exists to be compared against by
/// fake-oidc/the backend and was never meant to be dereferenced.
/// </summary>
public sealed class FakeOidcTokenClient : IDisposable
{
    private readonly HttpClient _httpClient;

    public FakeOidcTokenClient(Uri fakeOidcBaseAddress)
    {
        _httpClient = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
        {
            BaseAddress = fakeOidcBaseAddress
        };
    }

    public async Task<string> GetAccessTokenAsync(string userKey)
    {
        var query = "response_type=code" +
            $"&client_id={ElBaulImageFixture.OidcClientId}" +
            $"&redirect_uri={Uri.EscapeDataString(ElBaulImageFixture.OidcRedirectUri)}" +
            "&state=image-tests" +
            $"&user={userKey}";

        using var selectResponse = await _httpClient.GetAsync($"/authorize/select?{query}");

        if (selectResponse.StatusCode != HttpStatusCode.Found)
        {
            throw new InvalidOperationException(
                $"fake-oidc /authorize/select did not redirect as expected (status {selectResponse.StatusCode}) — " +
                "is OIDC_CLIENTS/OIDC_USERS configured to match this test's client id/user key?");
        }

        var redirectUri = selectResponse.Headers.Location
            ?? throw new InvalidOperationException("fake-oidc /authorize/select redirected without a Location header");
        var code = GetQueryParam(redirectUri, "code")
            ?? throw new InvalidOperationException($"fake-oidc /authorize/select redirect had no code: {redirectUri}");

        using var tokenResponse = await _httpClient.PostAsync("/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["client_id"] = ElBaulImageFixture.OidcClientId,
            ["redirect_uri"] = ElBaulImageFixture.OidcRedirectUri,
        }));
        tokenResponse.EnsureSuccessStatusCode();

        var payload = await tokenResponse.Content.ReadFromJsonAsync<TokenResponse>()
            ?? throw new InvalidOperationException("fake-oidc /token returned an empty body");
        return payload.AccessToken;
    }

    public void Dispose() => _httpClient.Dispose();

    private static string? GetQueryParam(Uri uri, string name) =>
        uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(pair => pair.Split('=', 2))
            .Where(parts => parts[0] == name)
            .Select(parts => Uri.UnescapeDataString(parts.ElementAtOrDefault(1) ?? string.Empty))
            .FirstOrDefault();

    private record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("id_token")] string IdToken,
        [property: JsonPropertyName("token_type")] string TokenType,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}
