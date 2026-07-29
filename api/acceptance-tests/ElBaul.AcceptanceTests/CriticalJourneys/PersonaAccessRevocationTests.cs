using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Black-box coverage for the Persona access lifecycle because it crosses public API shape,
/// persisted role values, authorization, and invitation behavior.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class PersonaAccessRevocationTests(ElBaulAcceptanceFixture fixture)
{
    [Fact]
    public async Task Revoking_persona_access_keeps_history_row_blocks_invites_and_can_be_reopened()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);
        using var guestClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulAcceptanceFixture.OidcSecondUserKey);
        using var anonymousClient = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };

        var baulId = await CreateBaulAsync(adminClient, "Baúl de revocación");
        var personaId = await CreatePersonaAsync(adminClient, baulId, "Persona revocable");

        var invitePreviewBeforeClaim = await anonymousClient.GetAsync($"/api/personas/{personaId}/invite-preview");
        invitePreviewBeforeClaim.StatusCode.Should().Be(HttpStatusCode.OK, await invitePreviewBeforeClaim.Content.ReadAsStringAsync());

        var acceptInviteResponse = await guestClient.PostAsync($"/api/personas/{personaId}/accept-invite", null);
        acceptInviteResponse.StatusCode.Should().Be(HttpStatusCode.OK, await acceptInviteResponse.Content.ReadAsStringAsync());

        var revokeResponse = await adminClient.DeleteAsync($"/api/baules/{baulId}/personas/{personaId}");
        revokeResponse.StatusCode.Should().Be(HttpStatusCode.OK, await revokeResponse.Content.ReadAsStringAsync());

        var revokedPersona = await GetPersonaAsync(adminClient, baulId, personaId);
        revokedPersona.GetProperty("role").GetString().Should().Be("sin_acceso");
        revokedPersona.GetProperty("status").GetString().Should().Be("sin_acceso");
        revokedPersona.GetProperty("userId").ValueKind.Should().Be(JsonValueKind.Null);
        revokedPersona.GetProperty("nickname").GetString().Should().Be("Persona revocable");

        var guestBaulAfterRevocation = await guestClient.GetAsync($"/api/baules/{baulId}");
        guestBaulAfterRevocation.StatusCode.Should().Be(HttpStatusCode.Forbidden, await guestBaulAfterRevocation.Content.ReadAsStringAsync());

        var revokedInvitePreview = await anonymousClient.GetAsync($"/api/personas/{personaId}/invite-preview");
        revokedInvitePreview.StatusCode.Should().Be(HttpStatusCode.NotFound, await revokedInvitePreview.Content.ReadAsStringAsync());

        var revokedAcceptInvite = await guestClient.PostAsync($"/api/personas/{personaId}/accept-invite", null);
        revokedAcceptInvite.StatusCode.Should().Be(HttpStatusCode.NotFound, await revokedAcceptInvite.Content.ReadAsStringAsync());

        var reopenResponse = await adminClient.PutAsJsonAsync(
            $"/api/baules/{baulId}/personas/{personaId}/role",
            new { role = "colaborador" });
        reopenResponse.StatusCode.Should().Be(HttpStatusCode.OK, await reopenResponse.Content.ReadAsStringAsync());
        var reopenedPersona = await ParseJsonAsync(reopenResponse);
        reopenedPersona.GetProperty("role").GetString().Should().Be("colaborador");
        reopenedPersona.GetProperty("status").GetString().Should().Be("pending");
        reopenedPersona.GetProperty("userId").ValueKind.Should().Be(JsonValueKind.Null);

        var invitePreviewAfterReopen = await anonymousClient.GetAsync($"/api/personas/{personaId}/invite-preview");
        invitePreviewAfterReopen.StatusCode.Should().Be(HttpStatusCode.OK, await invitePreviewAfterReopen.Content.ReadAsStringAsync());

        var acceptReopenedInviteResponse = await guestClient.PostAsync($"/api/personas/{personaId}/accept-invite", null);
        acceptReopenedInviteResponse.StatusCode.Should().Be(HttpStatusCode.OK, await acceptReopenedInviteResponse.Content.ReadAsStringAsync());

        var guestBaulAfterReaccept = await guestClient.GetAsync($"/api/baules/{baulId}");
        guestBaulAfterReaccept.StatusCode.Should().Be(HttpStatusCode.OK, await guestBaulAfterReaccept.Content.ReadAsStringAsync());
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

    private static async Task<string> CreatePersonaAsync(HttpClient client, string baulId, string nickname)
    {
        var response = await client.PostAsJsonAsync($"/api/baules/{baulId}/personas", new { nickname });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
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
