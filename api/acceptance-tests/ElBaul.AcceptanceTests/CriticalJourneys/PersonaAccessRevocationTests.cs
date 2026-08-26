using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Black-box coverage for the Persona access lifecycle because it crosses public API shape,
/// persisted role values, authorization, and the persona-scoped directed invite link.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class PersonaAccessRevocationTests(ElBaulAcceptanceFixture fixture)
{
    [Fact]
    public async Task Revoking_persona_access_keeps_history_row_and_invalidates_the_old_invite_token()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);
        using var guestClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcSecondUserKey);
        using var anonymousClient = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };

        var baulId = await CreateBaulAsync(adminClient, "Baúl de revocación");
        var personaId = await CreatePersonaAsync(adminClient, baulId, "Segunda persona de aceptación");
        var firstToken = await InvitePersonaAsync(adminClient, baulId, personaId);

        var previewResponse = await anonymousClient.GetAsync($"/api/persona-invites/{firstToken}/preview");
        previewResponse.StatusCode.Should().Be(HttpStatusCode.OK, await previewResponse.Content.ReadAsStringAsync());

        var acceptResponse = await guestClient.PostAsync($"/api/persona-invites/{firstToken}/accept", null);
        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK, await acceptResponse.Content.ReadAsStringAsync());
        var joinedPersona = await ParseJsonAsync(acceptResponse);
        joinedPersona.GetProperty("id").GetString().Should().Be(personaId, "the token resolves directly to the persona it was issued for");
        joinedPersona.GetProperty("status").GetString().Should().Be("active");

        var revokeResponse = await adminClient.DeleteAsync($"/api/baules/{baulId}/personas/{personaId}");
        revokeResponse.StatusCode.Should().Be(HttpStatusCode.OK, await revokeResponse.Content.ReadAsStringAsync());

        var revokedPersona = await GetPersonaAsync(adminClient, baulId, personaId);
        // "Revocar acceso" now also sets the role to sin_acceso — a revoked persona ends up in
        // exactly the state an admin would get by picking "Sin acceso" directly — on top of
        // clearing the account link, so the row falls back to Pending.
        revokedPersona.GetProperty("role").GetString().Should().Be("sin_acceso");
        revokedPersona.GetProperty("status").GetString().Should().Be("pending");
        revokedPersona.GetProperty("userId").ValueKind.Should().Be(JsonValueKind.Null);
        revokedPersona.GetProperty("nickname").GetString().Should().Be("Segunda persona de aceptación");

        var guestBaulAfterRevocation = await guestClient.GetAsync($"/api/baules/{baulId}");
        guestBaulAfterRevocation.StatusCode.Should().Be(HttpStatusCode.Forbidden, await guestBaulAfterRevocation.Content.ReadAsStringAsync());

        // The old per-person link is dead — explicit exception to invite tokens otherwise being
        // permanent/non-regenerable (see the ticket's refinement Q&A).
        var oldPreviewAfterRevocation = await anonymousClient.GetAsync($"/api/persona-invites/{firstToken}/preview");
        oldPreviewAfterRevocation.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // A sin_acceso persona can't be invited — the admin must pick a real access level
        // again first (same rule PersonaManager.UpdatePersonaRoleAsync enforces the other
        // direction: sin_acceso can't be set back on an Active persona).
        var roleUpdateResponse = await adminClient.PutAsJsonAsync(
            $"/api/baules/{baulId}/personas/{personaId}/role", new { role = "colaborador" });
        roleUpdateResponse.StatusCode.Should().Be(HttpStatusCode.OK, await roleUpdateResponse.Content.ReadAsStringAsync());

        // Re-inviting the same, now-Pending persona lazily issues a brand new token and lets
        // the (or another) guest claim it again.
        var secondToken = await InvitePersonaAsync(adminClient, baulId, personaId);
        secondToken.Should().NotBe(firstToken);

        var secondAcceptResponse = await guestClient.PostAsync($"/api/persona-invites/{secondToken}/accept", null);
        secondAcceptResponse.StatusCode.Should().Be(HttpStatusCode.OK, await secondAcceptResponse.Content.ReadAsStringAsync());
        var reclaimedPersona = await ParseJsonAsync(secondAcceptResponse);
        reclaimedPersona.GetProperty("id").GetString().Should().Be(personaId, "reclaiming must reuse the same history row, not create a new one");
        reclaimedPersona.GetProperty("status").GetString().Should().Be("active");
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

    private static async Task<string> CreatePersonaAsync(HttpClient adminClient, string baulId, string nickname)
    {
        var response = await adminClient.PostAsJsonAsync($"/api/baules/{baulId}/personas", new { nickname });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> InvitePersonaAsync(HttpClient adminClient, string baulId, string personaId)
    {
        var response = await adminClient.PostAsync($"/api/baules/{baulId}/personas/{personaId}/invite", null);
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
