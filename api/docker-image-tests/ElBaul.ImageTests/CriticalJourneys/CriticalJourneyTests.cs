using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.ImageTests.CriticalJourneys;

/// <summary>
/// The image's core public contract, exercised end to end through real HTTP calls, a real
/// token minted by a real (if fake) OIDC provider, and bytes actually round-tripped through
/// MinIO. Deliberately narrow — this is not a re-run of the backend's own domain test suite
/// (ElBaul.Tests already covers every business rule against fakes far more cheaply); it only
/// proves the wire contract the image exposes still works end to end: create a baúl, create a
/// chapter, upload a photo, get the same bytes back, add a recuerdo. All response shapes are
/// asserted via JsonDocument / local minimal records, never the backend's own DTOs.
/// </summary>
[Collection(ImageTestCollection.Name)]
public class CriticalJourneyTests(ElBaulImageFixture fixture)
{
    // A minimal valid 1x1 JPEG — real image bytes, not an arbitrary blob, so this exercises
    // whatever (if any) image handling happens on the upload path.
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task Full_content_creation_journey_succeeds()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulImageFixture.OidcAdminUserKey);

        using var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // 1. Create a baúl.
        var createBaulResponse = await client.PostAsJsonAsync("/api/baules", new
        {
            name = "Baúl de prueba de imagen",
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

        // 4. Download it back and confirm the actual bytes round-tripped through MinIO —
        // via the raw-download endpoint, not the imgproxy-backed thumbnail/full URLs, so this
        // doesn't depend on imgproxy being part of the stack under test.
        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        downloadResponse.Content.Headers.ContentType?.MediaType.Should().Be("image/jpeg");
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        downloadedBytes.Should().Equal(SampleJpegBytes, "the downloaded photo should be byte-identical to what was uploaded");

        // 5. Add a recuerdo to the photo.
        var recuerdoText = "Un recuerdo añadido por los tests de imagen";
        var createRecuerdoResponse = await client.PostAsJsonAsync($"/api/photos/{photoId}/recuerdos", new { text = recuerdoText });
        createRecuerdoResponse.StatusCode.Should().Be(HttpStatusCode.OK, await createRecuerdoResponse.Content.ReadAsStringAsync());
        var recuerdoJson = await ParseJsonAsync(createRecuerdoResponse);
        recuerdoJson.GetProperty("text").GetString().Should().Be(recuerdoText);
        recuerdoJson.GetProperty("photoId").GetString().Should().Be(photoId);
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
