using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Black-box coverage for the Persona access lifecycle because it crosses public API shape,
/// persisted role values, authorization, and the global baúl invite link.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class PersonaAccessRevocationTests(ElBaulAcceptanceFixture fixture)
{
    [Fact]
    public async Task Revoking_persona_access_keeps_history_row_and_blocks_access()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);
        using var guestClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcSecondUserKey);
        using var anonymousClient = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };

        var baulId = await CreateBaulAsync(adminClient, "Baúl de revocación");
        var token = await GetInviteLinkTokenAsync(adminClient, baulId);

        var previewResponse = await anonymousClient.GetAsync($"/api/baul-invites/{token}/preview");
        previewResponse.StatusCode.Should().Be(HttpStatusCode.OK, await previewResponse.Content.ReadAsStringAsync());

        var acceptResponse = await guestClient.PostAsJsonAsync($"/api/baul-invites/{token}/accept", new { personaId = (string?)null });
        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK, await acceptResponse.Content.ReadAsStringAsync());
        var joinedPersona = await ParseJsonAsync(acceptResponse);
        var personaId = joinedPersona.GetProperty("id").GetString()!;
        joinedPersona.GetProperty("nickname").GetString().Should().Be("Second Acceptance Test User");

        var revokeResponse = await adminClient.DeleteAsync($"/api/baules/{baulId}/personas/{personaId}");
        revokeResponse.StatusCode.Should().Be(HttpStatusCode.OK, await revokeResponse.Content.ReadAsStringAsync());

        var revokedPersona = await GetPersonaAsync(adminClient, baulId, personaId);
        revokedPersona.GetProperty("role").GetString().Should().Be("sin_acceso");
        revokedPersona.GetProperty("status").GetString().Should().Be("sin_acceso");
        revokedPersona.GetProperty("userId").ValueKind.Should().Be(JsonValueKind.Null);
        revokedPersona.GetProperty("nickname").GetString().Should().Be("Second Acceptance Test User");

        var guestBaulAfterRevocation = await guestClient.GetAsync($"/api/baules/{baulId}");
        guestBaulAfterRevocation.StatusCode.Should().Be(HttpStatusCode.Forbidden, await guestBaulAfterRevocation.Content.ReadAsStringAsync());

        // Reopening is admin-only now: there's no self-serve link tied to a single Persona
        // any more, only the global invite link. Resetting the role reuses the same history
        // row (same id, nickname, past tags) and moves it back to Pending; actually reclaiming
        // it as "active" again requires an admin-mediated path, not exercised here.
        var reopenResponse = await adminClient.PutAsJsonAsync(
            $"/api/baules/{baulId}/personas/{personaId}/role",
            new { role = "colaborador" });
        reopenResponse.StatusCode.Should().Be(HttpStatusCode.OK, await reopenResponse.Content.ReadAsStringAsync());
        var reopenedPersona = await ParseJsonAsync(reopenResponse);
        reopenedPersona.GetProperty("id").GetString().Should().Be(personaId, "reopening must reuse the same history row, not create a new one");
        reopenedPersona.GetProperty("role").GetString().Should().Be("colaborador");
        reopenedPersona.GetProperty("status").GetString().Should().Be("pending");
        reopenedPersona.GetProperty("userId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(FakeOidcTokenClient tokenClient, string userKey)
    {
        var accessToken = await tokenClient.GetAccessTokenAsync(userKey);
        var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<string> CreateBaulAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/baules", new
        {
            name,
            description = (string?)null
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> GetInviteLinkTokenAsync(HttpClient adminClient, string baulId)
    {
        var response = await adminClient.GetAsync($"/api/baules/{baulId}/invite-link");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("token").GetString()!;
    }

    private static async Task<JsonElement> GetPersonaAsync(HttpClient client, string baulId, string personaId)
    {
        var response = await client.GetAsync($"/api/baules/{baulId}/personas/{personaId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await ParseJsonAsync(response);
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
