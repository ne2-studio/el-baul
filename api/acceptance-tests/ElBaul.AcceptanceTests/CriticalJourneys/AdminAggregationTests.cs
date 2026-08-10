using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// AdminRepository backs the backoffice's Dashboard/Usuarios/Baúles screens with EF Core
/// GroupBy/Join/Distinct/SumAsync queries that run server-side as SQL — two of its own comments
/// already flag a real translation gotcha ("Persona.IsClaimed can't be used here... EF can't
/// translate a C#-only computed property"). ElBaul.Tests' AdminManagerTests runs against
/// InMemoryAdminRepository, which is a plain settable property bag a test populates directly —
/// it never executes a single line of AdminRepository's actual query logic. This is the one
/// place that only manifests against a real database, which is exactly what this project exists
/// for. See docs/architecture/backend.md and the architecture-gap-scout report this addresses
/// for the full rationale.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class AdminAggregationTests(ElBaulAcceptanceFixture fixture)
{
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task GetUsers_and_GetUserDetail_count_distinct_baules_the_user_belongs_to()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);
        using var guestClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcSecondUserKey);

        // Forces UserSyncMiddleware to sync the guest's row before the baseline read below, so
        // the baseline is accurate regardless of whether an earlier test class already did this.
        (await guestClient.GetAsync("/api/users/me")).EnsureSuccessStatusCode();

        var baulXId = await CreateBaulAsync(adminClient, "Baúl de agregación X");
        var baulYId = await CreateBaulAsync(adminClient, "Baúl de agregación Y");
        var baulCountBefore = await GetGuestBaulCountAsync(adminClient);

        // The guest joins both baúles — one Persona row per baúl, same underlying user.
        var personaXId = await JoinBaulAsync(adminClient, guestClient, baulXId);
        var personaYId = await JoinBaulAsync(adminClient, guestClient, baulYId);

        var users = await GetJsonAsync(adminClient, "/api/admin/users");
        var guestRow = users.EnumerateArray().Single(u => u.GetProperty("id").GetString() == ElBaulAcceptanceFixture.OidcSecondUserSub);
        guestRow.GetProperty("baulCount").GetInt32().Should().Be(baulCountBefore + 2,
            "GetAllUsersAsync groups Personas by distinct BaulId per user, not by persona-row count");

        var userDetail = await GetJsonAsync(adminClient, $"/api/admin/users/{ElBaulAcceptanceFixture.OidcSecondUserSub}");
        var baules = userDetail.GetProperty("baules").EnumerateArray().ToList();
        baules.Should().ContainSingle(b =>
            b.GetProperty("baulId").GetString() == baulXId &&
            b.GetProperty("personId").GetString() == personaXId &&
            b.GetProperty("role").GetString() == "colaborador");
        baules.Should().ContainSingle(b =>
            b.GetProperty("baulId").GetString() == baulYId &&
            b.GetProperty("personId").GetString() == personaYId &&
            b.GetProperty("role").GetString() == "colaborador");
    }

    [Fact]
    public async Task GetBaules_and_GetBaulDetail_aggregate_counts_and_distinguish_claimed_personas()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);
        using var guestClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcSecondUserKey);

        var baulId = await CreateBaulAsync(adminClient, "Baúl de agregación de administración");

        // Three Personas, only two of them claimed: the custodio's own row (created
        // automatically), the guest's row (claimed by joining), and one pre-provisioned row
        // nobody has claimed yet — the exact shape AdminRepository's own comments warn about.
        var guestPersonaId = await JoinBaulAsync(adminClient, guestClient, baulId);
        var unclaimedPersonaResponse = await adminClient.PostAsJsonAsync(
            $"/api/baules/{baulId}/personas", new { nickname = "Persona sin reclamar" });
        unclaimedPersonaResponse.StatusCode.Should().Be(HttpStatusCode.OK, await unclaimedPersonaResponse.Content.ReadAsStringAsync());
        var unclaimedPersonaId = (await ParseJsonAsync(unclaimedPersonaResponse)).GetProperty("id").GetString()!;

        var chapterId = await CreateChapterAsync(adminClient, baulId, "Capítulo de agregación");
        await UploadPhotoAsync(adminClient, chapterId, "agregacion.jpg");

        var baules = await GetJsonAsync(adminClient, "/api/admin/baules");
        var baulRow = baules.EnumerateArray().Single(b => b.GetProperty("id").GetString() == baulId);
        baulRow.GetProperty("memberCount").GetInt32().Should().Be(3, "custodio + guest colaborador + the unclaimed persona");
        baulRow.GetProperty("linkedUserCount").GetInt32().Should().Be(2,
            "only the custodio and the guest are claimed — the pre-provisioned persona has no linked user yet");
        baulRow.GetProperty("photoCount").GetInt32().Should().Be(1);
        baulRow.GetProperty("chapterCount").GetInt32().Should().Be(1);

        var baulDetail = await GetJsonAsync(adminClient, $"/api/admin/baules/{baulId}");
        var stats = baulDetail.GetProperty("stats");
        stats.GetProperty("personas").GetInt32().Should().Be(3);
        stats.GetProperty("photos").GetInt32().Should().Be(1);
        stats.GetProperty("chapters").GetInt32().Should().Be(1);
        stats.GetProperty("totalSizeBytes").GetInt64().Should().Be(SampleJpegBytes.Length);

        var personas = baulDetail.GetProperty("personas").EnumerateArray().ToList();
        var unclaimedPersona = personas.Single(p => p.GetProperty("personId").GetString() == unclaimedPersonaId);
        unclaimedPersona.GetProperty("linkedUserId").ValueKind.Should().Be(JsonValueKind.Null);
        unclaimedPersona.GetProperty("linkedUserName").ValueKind.Should().Be(JsonValueKind.Null);

        var claimedGuestPersona = personas.Single(p => p.GetProperty("personId").GetString() == guestPersonaId);
        claimedGuestPersona.GetProperty("linkedUserId").GetString().Should().Be(ElBaulAcceptanceFixture.OidcSecondUserSub);
        claimedGuestPersona.GetProperty("linkedUserName").GetString().Should().Be("Second Acceptance Test User");
    }

    // Regression coverage for the count-includes-soft-deleted-photos bug: AdminRepository's photo
    // counts (dashboard, per-baúl list, baúl detail) used to run with no PhotoStatus.Active filter
    // — the only place in the persistence layer that didn't — so a deleted photo's row, which
    // survives the soft delete, kept inflating every one of these numbers. totalSizeBytes is the
    // deliberate exception: the object stays in storage after a soft delete, so it should (and
    // still does) count toward it.
    [Fact]
    public async Task GetDashboard_GetBaules_and_GetBaulDetail_exclude_soft_deleted_photos_from_photo_counts()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);

        var baulId = await CreateBaulAsync(adminClient, "Baúl de fotos borradas");
        var chapterId = await CreateChapterAsync(adminClient, baulId, "Capítulo de fotos borradas");

        await UploadPhotoAsync(adminClient, chapterId, "kept.jpg");
        var deletedPhotoId = await UploadPhotoAsync(adminClient, chapterId, "deleted.jpg");

        var dashboardBefore = await GetJsonAsync(adminClient, "/api/admin/dashboard");
        var totalPhotosBefore = dashboardBefore.GetProperty("totalPhotos").GetInt32();

        await DeletePhotoAsync(adminClient, deletedPhotoId);

        var dashboardAfter = await GetJsonAsync(adminClient, "/api/admin/dashboard");
        dashboardAfter.GetProperty("totalPhotos").GetInt32().Should().Be(totalPhotosBefore - 1,
            "the deleted photo's row survives the soft delete and must not still be counted");

        var baules = await GetJsonAsync(adminClient, "/api/admin/baules");
        var baulRow = baules.EnumerateArray().Single(b => b.GetProperty("id").GetString() == baulId);
        baulRow.GetProperty("photoCount").GetInt32().Should().Be(1, "only the kept photo is still active");

        var baulDetail = await GetJsonAsync(adminClient, $"/api/admin/baules/{baulId}");
        var stats = baulDetail.GetProperty("stats");
        stats.GetProperty("photos").GetInt32().Should().Be(1);
        stats.GetProperty("totalSizeBytes").GetInt64().Should().Be(2 * SampleJpegBytes.Length,
            "unlike photoCount, totalSizeBytes counts the deleted photo too — its file is still in storage");
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
        var response = await client.PostAsJsonAsync("/api/baules", new { name, description = (string?)null });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> CreateChapterAsync(HttpClient client, string baulId, string name)
    {
        var response = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters", new { name });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> UploadPhotoAsync(HttpClient client, string chapterId, string fileName)
    {
        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(SampleJpegBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", fileName);
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");

        var response = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task DeletePhotoAsync(HttpClient client, string photoId)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/photos/{photoId}")
        {
            Content = JsonContent.Create(new { reason = (string?)null })
        };
        var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    private static async Task<string> JoinBaulAsync(HttpClient adminClient, HttpClient guestClient, string baulId)
    {
        var token = await GetInviteLinkTokenAsync(adminClient, baulId);
        var acceptResponse = await guestClient.PostAsJsonAsync($"/api/baul-invites/{token}/accept", new { personaId = (string?)null });
        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK, await acceptResponse.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(acceptResponse)).GetProperty("id").GetString()!;
    }

    private static async Task<string> GetInviteLinkTokenAsync(HttpClient adminClient, string baulId)
    {
        var response = await adminClient.GetAsync($"/api/baules/{baulId}/invite-link");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("token").GetString()!;
    }

    private static async Task<int> GetGuestBaulCountAsync(HttpClient adminClient)
    {
        var response = await adminClient.GetAsync($"/api/admin/users/{ElBaulAcceptanceFixture.OidcSecondUserSub}");
        if (response.StatusCode == HttpStatusCode.NotFound) return 0;
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("baules").GetArrayLength();
    }

    private static async Task<JsonElement> GetJsonAsync(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await ParseJsonAsync(response);
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
