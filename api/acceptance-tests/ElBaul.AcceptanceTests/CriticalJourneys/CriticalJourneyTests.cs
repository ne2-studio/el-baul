using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// The image's core public contract, exercised end to end through real HTTP calls, a real
/// token minted by a real (if fake) OIDC provider, and bytes actually round-tripped through
/// MinIO. Deliberately narrow — this is not a re-run of the backend's own domain test suite
/// (ElBaul.Tests already covers every business rule against fakes far more cheaply); it only
/// proves the wire contract the image exposes still works end to end: create a baúl, create a
/// chapter, upload a photo, get the same bytes back, add a recuerdo. All response shapes are
/// asserted via JsonDocument / local minimal records, never the backend's own DTOs.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class CriticalJourneyTests(ElBaulAcceptanceFixture fixture)
{
    // A minimal valid 1x1 JPEG — real image bytes, not an arbitrary blob, so this exercises
    // whatever (if any) image handling happens on the upload path.
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task Full_content_creation_journey_succeeds()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulAcceptanceFixture.OidcAdminUserKey);

        using var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // 1. Create a baúl.
        var createBaulResponse = await client.PostAsJsonAsync("/api/baules", new
        {
            name = "Baúl de prueba de aceptación",
            description = (string?)null
        });
        createBaulResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createBaulResponse.Content.ReadAsStringAsync());
        var baulId = (await ParseJsonAsync(createBaulResponse)).GetProperty("id").GetString();
        baulId.Should().NotBeNullOrWhiteSpace();

        // 2. Create a chapter inside it.
        var createChapterResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters", new
        {
            name = "Capítulo de prueba"
        });
        createChapterResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createChapterResponse.Content.ReadAsStringAsync());
        var chapterId = (await ParseJsonAsync(createChapterResponse)).GetProperty("id").GetString();
        chapterId.Should().NotBeNullOrWhiteSpace();

        // 3. Upload a photo into that chapter.
        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(SampleJpegBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", "sample.jpg");
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");

        var uploadResponse = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK, await uploadResponse.Content.ReadAsStringAsync());
        var photoId = (await ParseJsonAsync(uploadResponse)).GetProperty("id").GetString();
        photoId.Should().NotBeNullOrWhiteSpace();

        // 3b. The untagged-suggestion query orders candidates with EF.Functions.Random(),
        // which only Npgsql (not the in-memory fixture ElBaul.Tests runs against) needs to
        // translate — this is the one place that translation actually runs against real
        // Postgres, so it's worth a dedicated assertion rather than folding into step 4.
        var untaggedSuggestionResponse = await client.GetAsync($"/api/baules/{baulId}/photos/untagged-suggestion");
        untaggedSuggestionResponse.StatusCode.Should().Be(HttpStatusCode.OK, await untaggedSuggestionResponse.Content.ReadAsStringAsync());
        (await ParseJsonAsync(untaggedSuggestionResponse)).GetProperty("id").GetString().Should().Be(photoId);

        // 4. Download it back and confirm the actual bytes round-tripped through MinIO —
        // via the raw-download endpoint, not the imgproxy-backed thumbnail/full URLs, so this
        // doesn't depend on imgproxy being part of the stack under test.
        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        downloadResponse.Content.Headers.ContentType?.MediaType.Should().Be("image/jpeg");
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        downloadedBytes.Should().Equal(SampleJpegBytes, "the downloaded photo should be byte-identical to what was uploaded");

        // 5. Add a recuerdo to the photo.
        var recuerdoText = "Un recuerdo añadido por los tests de aceptación";
        var createRecuerdoResponse = await client.PostAsJsonAsync($"/api/photos/{photoId}/recuerdos", new { text = recuerdoText });
        createRecuerdoResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createRecuerdoResponse.Content.ReadAsStringAsync());
        var recuerdoJson = await ParseJsonAsync(createRecuerdoResponse);
        recuerdoJson.GetProperty("text").GetString().Should().Be(recuerdoText);
        recuerdoJson.GetProperty("photoId").GetString().Should().Be(photoId);
        var recuerdoId = recuerdoJson.GetProperty("id").GetString();
        var recuerdoAuthor = recuerdoJson.GetProperty("userId").GetString();
        var recuerdoCreatedAt = recuerdoJson.GetProperty("createdAt").GetDateTime();
        recuerdoId.Should().NotBeNullOrWhiteSpace();

        // 6. Edit only that recuerdo's content through its public endpoint.
        var editedRecuerdoText = "Un recuerdo editado por los tests de aceptación";
        var updateRecuerdoResponse = await client.PutAsJsonAsync($"/api/recuerdos/{recuerdoId}", new { text = editedRecuerdoText });
        updateRecuerdoResponse.StatusCode.Should().Be(HttpStatusCode.OK, await updateRecuerdoResponse.Content.ReadAsStringAsync());
        var editedRecuerdoJson = await ParseJsonAsync(updateRecuerdoResponse);
        editedRecuerdoJson.GetProperty("id").GetString().Should().Be(recuerdoId);
        editedRecuerdoJson.GetProperty("text").GetString().Should().Be(editedRecuerdoText);
        editedRecuerdoJson.GetProperty("userId").GetString().Should().Be(recuerdoAuthor);
        editedRecuerdoJson.GetProperty("createdAt").GetDateTime().Should().BeCloseTo(recuerdoCreatedAt, TimeSpan.FromMilliseconds(1));
        editedRecuerdoJson.GetProperty("photoId").GetString().Should().Be(photoId);
    }

    [Fact]
    public async Task Approving_removal_request_hides_photo_but_keeps_downloadable_blob()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulAcceptanceFixture.OidcAdminUserKey);

        using var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var createBaulResponse = await client.PostAsJsonAsync("/api/baules", new
        {
            name = "Baúl de solicitud de retirada",
            description = (string?)null
        });
        createBaulResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createBaulResponse.Content.ReadAsStringAsync());
        var baulId = (await ParseJsonAsync(createBaulResponse)).GetProperty("id").GetString();

        var createChapterResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters", new
        {
            name = "Capítulo con retirada"
        });
        createChapterResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createChapterResponse.Content.ReadAsStringAsync());
        var chapterId = (await ParseJsonAsync(createChapterResponse)).GetProperty("id").GetString();

        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(SampleJpegBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", "removal-sample.jpg");
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");

        var uploadResponse = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK, await uploadResponse.Content.ReadAsStringAsync());
        var photoId = (await ParseJsonAsync(uploadResponse)).GetProperty("id").GetString();
        photoId.Should().NotBeNullOrWhiteSpace();

        var createRequestResponse = await client.PostAsJsonAsync($"/api/baules/{baulId}/removal-requests", new
        {
            photoId,
            reason = "Retirada validada por test de aceptación"
        });
        createRequestResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createRequestResponse.Content.ReadAsStringAsync());
        var requestId = (await ParseJsonAsync(createRequestResponse)).GetProperty("id").GetString();
        requestId.Should().NotBeNullOrWhiteSpace();

        var approveResponse = await client.PostAsync($"/api/baules/{baulId}/removal-requests/{requestId}/approve", null);
        approveResponse.StatusCode.Should().Be(HttpStatusCode.OK, await approveResponse.Content.ReadAsStringAsync());

        var chapterPhotosResponse = await client.GetAsync($"/api/chapters/{chapterId}/photos");
        chapterPhotosResponse.StatusCode.Should().Be(HttpStatusCode.OK, await chapterPhotosResponse.Content.ReadAsStringAsync());
        var chapterPhotosJson = await ParseJsonAsync(chapterPhotosResponse);
        chapterPhotosJson.EnumerateArray()
            .Select(photo => photo.GetProperty("id").GetString())
            .Should().NotContain(photoId);

        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK, await downloadResponse.Content.ReadAsStringAsync());
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        downloadedBytes.Should().Equal(SampleJpegBytes, "approval should soft-delete metadata without deleting the storage object");
    }

    [Fact]
    public async Task Rejects_unauthenticated_requests_to_protected_endpoints()
    {
        using var anonymousClient = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };

        var response = await anonymousClient.PostAsJsonAsync("/api/baules", new { name = "No debería crearse", description = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
