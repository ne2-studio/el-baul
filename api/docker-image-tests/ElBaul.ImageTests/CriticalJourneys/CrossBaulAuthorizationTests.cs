using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.ImageTests.CriticalJourneys;

/// <summary>
/// Black-box authorization checks at the public HTTP boundary. These scenarios deliberately
/// use two real tokens and two baúles so regressions in auth, routing, EF, or storage wiring
/// are observable against the deployed image shape, without referencing backend DTOs.
/// </summary>
[Collection(ImageTestCollection.Name)]
public class CrossBaulAuthorizationTests(ElBaulImageFixture fixture)
{
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task Authenticated_admin_of_another_baul_cannot_list_or_modify_foreign_personas()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var firstClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulImageFixture.OidcAdminUserKey);
        using var secondClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulImageFixture.OidcSecondUserKey);

        _ = await CreateBaulAsync(firstClient, "Baúl del primer usuario");
        var secondBaulId = await CreateBaulAsync(secondClient, "Baúl del segundo usuario");
        var secondPersonas = await GetPersonasAsync(secondClient, secondBaulId);
        var secondPersona = secondPersonas.EnumerateArray().First();
        var secondPersonaId = secondPersona.GetProperty("id").GetString();
        var secondPersonaNickname = secondPersona.GetProperty("nickname").GetString();

        var listForeignPersonasResponse = await firstClient.GetAsync($"/api/baules/{secondBaulId}/personas");
        listForeignPersonasResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden, await listForeignPersonasResponse.Content.ReadAsStringAsync());

        var updateForeignPersonaResponse = await firstClient.PutAsJsonAsync(
            $"/api/baules/{secondBaulId}/personas/{secondPersonaId}",
            new
            {
                name = "Nombre inyectado",
                nickname = secondPersonaNickname,
                biografia = "No debe persistirse"
            });
        updateForeignPersonaResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden, await updateForeignPersonaResponse.Content.ReadAsStringAsync());

        var personasAfterRejectedUpdate = await GetPersonasAsync(secondClient, secondBaulId);
        var unchangedPersona = personasAfterRejectedUpdate.EnumerateArray()
            .Single(persona => persona.GetProperty("id").GetString() == secondPersonaId);
        unchangedPersona.GetProperty("name").GetString().Should().NotBe("Nombre inyectado");
        unchangedPersona.GetProperty("biografia").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Removal_requests_cannot_cross_baul_boundaries_and_approval_soft_deletes_only_the_target_photo()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var firstClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulImageFixture.OidcAdminUserKey);
        using var secondClient = await CreateAuthenticatedClientAsync(
            tokenClient, ElBaulImageFixture.OidcSecondUserKey);

        var firstBaulId = await CreateBaulAsync(firstClient, "Baúl ajeno a la retirada");
        var secondBaulId = await CreateBaulAsync(secondClient, "Baúl dueño de la foto");
        var secondChapterId = await CreateChapterAsync(secondClient, secondBaulId, "Capítulo dueño de la foto");
        var secondPhotoId = await UploadPhotoAsync(secondClient, secondChapterId, "owned-by-second-user.jpg");

        var crossBaulCreateResponse = await firstClient.PostAsJsonAsync($"/api/baules/{firstBaulId}/removal-requests", new
        {
            photoId = secondPhotoId,
            reason = "Intento de retirada cross-baúl"
        });
        crossBaulCreateResponse.StatusCode.Should().Be(HttpStatusCode.NotFound, await crossBaulCreateResponse.Content.ReadAsStringAsync());

        var createRequestResponse = await secondClient.PostAsJsonAsync($"/api/baules/{secondBaulId}/removal-requests", new
        {
            photoId = secondPhotoId,
            reason = "Retirada legítima del baúl dueño"
        });
        createRequestResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createRequestResponse.Content.ReadAsStringAsync());
        var requestId = (await ParseJsonAsync(createRequestResponse)).GetProperty("id").GetString();
        requestId.Should().NotBeNullOrWhiteSpace();

        var crossBaulApproveResponse = await firstClient.PostAsync($"/api/baules/{firstBaulId}/removal-requests/{requestId}/approve", null);
        crossBaulApproveResponse.StatusCode.Should().Be(HttpStatusCode.NotFound, await crossBaulApproveResponse.Content.ReadAsStringAsync());

        var downloadBeforeValidApproval = await secondClient.GetAsync($"/api/photos/{secondPhotoId}/download");
        downloadBeforeValidApproval.StatusCode.Should().Be(HttpStatusCode.OK, await downloadBeforeValidApproval.Content.ReadAsStringAsync());

        var approveResponse = await secondClient.PostAsync($"/api/baules/{secondBaulId}/removal-requests/{requestId}/approve", null);
        approveResponse.StatusCode.Should().Be(HttpStatusCode.OK, await approveResponse.Content.ReadAsStringAsync());

        var chapterPhotos = await GetJsonAsync(secondClient, $"/api/chapters/{secondChapterId}/photos");
        chapterPhotos.EnumerateArray()
            .Select(photo => photo.GetProperty("id").GetString())
            .Should().NotContain(secondPhotoId);

        var baulPhotosPage = await GetJsonAsync(secondClient, $"/api/baules/{secondBaulId}/photos");
        baulPhotosPage.GetProperty("items").EnumerateArray()
            .Select(photo => photo.GetProperty("id").GetString())
            .Should().NotContain(secondPhotoId);

        var downloadAfterApproval = await secondClient.GetAsync($"/api/photos/{secondPhotoId}/download");
        downloadAfterApproval.StatusCode.Should().Be(HttpStatusCode.OK, await downloadAfterApproval.Content.ReadAsStringAsync());
        var downloadedBytes = await downloadAfterApproval.Content.ReadAsByteArrayAsync();
        downloadedBytes.Should().Equal(SampleJpegBytes, "approval soft-deletes metadata without deleting the storage object");
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

    private static async Task<JsonElement> GetPersonasAsync(HttpClient client, string baulId) =>
        await GetJsonAsync(client, $"/api/baules/{baulId}/personas");

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
