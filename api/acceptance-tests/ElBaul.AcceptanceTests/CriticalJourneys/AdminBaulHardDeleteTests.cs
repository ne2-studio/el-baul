using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// AdminManager.DeleteBaulAsync hard-deletes a baúl by issuing 8+ repository calls in a
/// specific, manually-maintained order (see its own doc comment) to satisfy real Postgres
/// Restrict foreign keys — most sharply, PhotoPersonaTag, which has a Restrict FK to *both*
/// Photo and Persona, so it must be gone before either of those can go. ElBaul.Tests covers
/// this against hand-written in-memory fakes that enforce no referential integrity at all, so
/// a reordering that would raise a live FK violation (or silently orphan a row) passes there
/// unnoticed — this is the one place that only manifests against a real database, which is
/// exactly what this project exists for. See docs/architecture/backend.md and the
/// architecture-gap-scout report this addresses for the full rationale.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class AdminBaulHardDeleteTests(ElBaulAcceptanceFixture fixture)
{
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task Hard_deleting_a_baul_with_every_child_entity_type_succeeds_and_removes_it()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulAcceptanceFixture.OidcAdminUserKey);

        using var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // 1. Baúl, chapter, photo, recuerdo — the ordinary content chain.
        var baulId = await CreateBaulAsync(client, "Baúl a borrar por completo");

        var createChapterResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters", new { name = "Capítulo a borrar" });
        createChapterResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createChapterResponse.Content.ReadAsStringAsync());
        var chapterId = (await ParseJsonAsync(createChapterResponse)).GetProperty("id").GetString();

        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(SampleJpegBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", "to-delete.jpg");
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");
        var uploadResponse = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK, await uploadResponse.Content.ReadAsStringAsync());
        var photoId = (await ParseJsonAsync(uploadResponse)).GetProperty("id").GetString();

        var createRecuerdoResponse = await client.PostAsJsonAsync($"/api/photos/{photoId}/recuerdos", new { text = "Un recuerdo que también se borra" });
        createRecuerdoResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createRecuerdoResponse.Content.ReadAsStringAsync());

        // 2. A second, non-custodio persona, tagged on the photo — the sharpest case:
        // PhotoPersonaTag has a Restrict FK to *both* Photo and Persona (see
        // PhotoPersonaTagConfiguration), so it's the one row that must be gone before either
        // of those two deletions can succeed. Getting AdminManager's deletion order wrong
        // around this specific entity is exactly the bug class a fake can't catch.
        var createPersonaResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/personas", new { nickname = "Tía a borrar" });
        createPersonaResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createPersonaResponse.Content.ReadAsStringAsync());
        var personaId = (await ParseJsonAsync(createPersonaResponse)).GetProperty("id").GetString();

        var tagResponse = await client.PutAsJsonAsync($"/api/photos/{photoId}/personas", new { personaIds = new[] { personaId } });
        tagResponse.StatusCode.Should().Be(HttpStatusCode.OK, await tagResponse.Content.ReadAsStringAsync());

        // 3. A baúl invite link — a Restrict FK straight to Baul itself (like SharedLink,
        // deliberately not exercised here since Features:SharedLinksEnabled defaults to false
        // in this image and the acceptance fixture doesn't override it — AdminManager still
        // unconditionally calls sharedLinkRepository.DeleteByBaulIdAsync, it just has nothing
        // to delete), so it must be gone before the Baul row can go.
        var inviteLinkResponse = await client.GetAsync($"/api/baules/{baulId}/invite-link");
        inviteLinkResponse.StatusCode.Should().Be(HttpStatusCode.OK, await inviteLinkResponse.Content.ReadAsStringAsync());

        // 4. A pending removal request — Cascade at the DB level, but AdminManager deletes it
        // explicitly anyway (see its own doc comment) so behavior doesn't depend on which
        // backend is running; included here so this test covers every entity type that
        // comment names, not just the two Restrict-FK cases above.
        var removalRequestResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/removal-requests", new
        {
            photoId,
            reason = "Solicitud pendiente en el baúl a borrar"
        });
        removalRequestResponse.StatusCode.Should().Be(HttpStatusCode.OK, await removalRequestResponse.Content.ReadAsStringAsync());

        // 5. Hard-delete the whole baúl through the real admin endpoint. A 200 here — not a
        // 500 from an unhandled Postgres foreign-key violation — is the direct proof that
        // AdminManager's hand-maintained deletion order is still correct against the real
        // schema, for every child entity type it names.
        var deleteResponse = await client.DeleteAsync($"/api/admin/baules/{baulId}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent, await deleteResponse.Content.ReadAsStringAsync());

        // 6. The baúl itself is genuinely gone, not just reported as deleted.
        var getAfterDeleteResponse = await client.GetAsync($"/api/baules/{baulId}");
        getAfterDeleteResponse.StatusCode.Should().Be(HttpStatusCode.NotFound, await getAfterDeleteResponse.Content.ReadAsStringAsync());
    }

    private static async Task<string> CreateBaulAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/baules", new { name, description = (string?)null });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
