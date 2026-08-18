using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Proves the real upload -> normalize -> store pipeline end to end against the built image
/// (real libvips via the `vips` apk package, real MinIO) — not just that PhotoFileService calls
/// the right ports (ElBaul.Tests) or that VipsImageProcessor resizes correctly in isolation
/// (ElBaul.Infra.Tests). ElBaulAcceptanceFixture configures a small
/// ImagePolicy__MaxStoredLongEdge (64px) for the whole stack so this can use a real, tiny JPEG
/// fixture instead of an actual multi-megapixel one.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class PhotoNormalizationTests(ElBaulAcceptanceFixture fixture)
{
    // A real 200x100 JPEG (2:1 aspect ratio) — well over the 64px MaxStoredLongEdge the fixture
    // configures for the backend under test, so uploading it must trigger normalization down
    // to (at most) 64x32.
    private static readonly byte[] OversizedJpegBytes = Convert.FromBase64String(
        "/9j/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAMgAAAADoAQAAQAAAGQAAAAAAAAA/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgAZADIAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A89ooor5Q+lCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==");

    // The same minimal 1x1 JPEG used across CriticalJourneyTests — well under the 64px limit,
    // so it must round-trip byte-for-byte, exactly like the un-normalized-path acceptance
    // criterion requires.
    private static readonly byte[] CompliantJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    // A real, tiny (20x20) HEIC file, produced with libheif's heif-enc. Its client-declared
    // filename/content-type get set to "photo.jpg"/"image/jpeg" by UploadPhotoAsync below — the
    // ticket's own worked example of a HEIC file mislabeled as a JPEG. Detection/conversion must
    // still happen because it's driven purely by these bytes' ISOBMFF `ftyp` box, never by that
    // label (see HeicSniffer, HeicToJpegPhotoImageNormalizer).
    private static readonly byte[] MislabeledHeicBytes = Convert.FromBase64String(
        "AAAAHGZ0eXBoZWl4AAAAAG1pZjFoZWl4bWlhZgAAAbdtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAHbAAEAAAAAAAAAIwACAAAAAAH+AAEAAAAAAAAAuAAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGh2YzEAAAAAFWluZmUCAAABAAIAAEV4aWYAAAAA9mlwcnAAAADWaXBjbwAAAHFodmNDAQQIAAAAAAAAAAAAHvAA/Pz4+AAADwNgAAEAF0ABDAH//wQIAAADAJ/4AAADAAAeugJAYQABACZCAQEECAAAAwCf+AAAAwAAHsCCBBZbqrprmwIAAAMAMgAAAwACEGIAAQAGRAHBc8GJAAAAE2NvbHJuY2x4AAEADQAGgAAAABRpc3BlAAAAAAAAAEAAAABAAAAAKGNsYXAAAAAUAAAAAQAAABQAAAAB////1AAAAAL////UAAAAAgAAAA5waXhpAAAAAAEIAAAAGGlwbWEAAAAAAAAAAQABBYECAwWEAAAAGmlyZWYAAAAAAAAADmNkc2MAAgABAAEAAADjbWRhdAAAAB8oAa4mQkok59cN//4fCxdhVXNTsmwgYkQpEoBj9fSuAAAAAElJKgAIAAAABgASAQMAAQAAAAEAAAAaAQUAAQAAAFYAAAAbAQUAAQAAAF4AAAAoAQMAAQAAAAIAAAATAgMAAQAAAAEAAABphwQAAQAAAGYAAAAAAAAAOGMAAOgDAAA4YwAA6AMAAAYAAJAHAAQAAAAwMjEwAZEHAAQAAAABAgMAAKAHAAQAAAAwMTAwAaADAAEAAAD//wAAAqAEAAEAAAAUAAAAA6AEAAEAAAAUAAAAAAAAAA==");

    [Fact]
    public async Task Uploading_an_oversized_photo_normalizes_it_down_to_the_policy_limit()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient);

        var baulId = await CreateBaulAsync(client, "Baúl de normalización");
        var chapterId = await CreateChapterAsync(client, baulId, "Capítulo de normalización");

        var photoId = await UploadPhotoAsync(client, chapterId, OversizedJpegBytes, "oversized.jpg");

        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();

        downloadedBytes.Should().NotEqual(OversizedJpegBytes, "the oversized original must not be the stored asset");

        var (width, height) = JpegDimensions.Read(downloadedBytes);
        width.Should().BeLessOrEqualTo(64);
        height.Should().BeLessOrEqualTo(64);
        // Aspect ratio (2:1) preserved, long edge capped exactly at the policy limit.
        width.Should().Be(64);
        height.Should().Be(32);
    }

    [Fact]
    public async Task Uploading_a_compliant_photo_stores_it_unchanged()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient);

        var baulId = await CreateBaulAsync(client, "Baúl sin normalizar");
        var chapterId = await CreateChapterAsync(client, baulId, "Capítulo sin normalizar");

        var photoId = await UploadPhotoAsync(client, chapterId, CompliantJpegBytes, "compliant.jpg");

        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();

        downloadedBytes.Should().Equal(CompliantJpegBytes, "a photo already within policy must not be recompressed");
    }

    [Fact]
    public async Task Uploading_a_heic_photo_mislabeled_as_jpeg_still_gets_detected_and_converted_by_its_bytes()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient);

        var baulId = await CreateBaulAsync(client, "Baúl HEIC");
        var chapterId = await CreateChapterAsync(client, baulId, "Capítulo HEIC");

        // UploadPhotoAsync always declares "image/jpeg" as the upload's content-type and this
        // filename below — a JPEG mislabel over real HEIC bytes, exactly the ticket scenario.
        var photoId = await UploadPhotoAsync(client, chapterId, MislabeledHeicBytes, "photo.jpg");

        var downloadResponse = await client.GetAsync($"/api/photos/{photoId}/download");
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();

        downloadedBytes.Should().NotEqual(MislabeledHeicBytes, "the raw HEIC bytes must have been converted, not stored as-is");
        downloadedBytes.Take(3).Should().Equal(new byte[] { 0xFF, 0xD8, 0xFF }, "the stored asset must be a real JPEG (SOI + marker), proving conversion actually ran");
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(FakeOidcTokenClient tokenClient)
    {
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulAcceptanceFixture.OidcAdminUserKey);
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

    private static async Task<string> UploadPhotoAsync(HttpClient client, string chapterId, byte[] bytes, string fileName)
    {
        using var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", fileName);
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");

        var response = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        var stream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(stream);
        return document.RootElement.Clone();
    }
}

/// <summary>Reads only the width/height a baseline/progressive JPEG's SOF marker carries —
/// enough to assert normalization actually resized the stored asset, without pulling an image
/// decoding library into this dependency-light acceptance-tests project just for two numbers.</summary>
internal static class JpegDimensions
{
    public static (int Width, int Height) Read(byte[] jpeg)
    {
        var offset = 2; // skip the SOI marker (0xFFD8)
        while (offset < jpeg.Length - 1)
        {
            if (jpeg[offset] != 0xFF) throw new InvalidOperationException("Not a valid JPEG marker sequence");
            var marker = jpeg[offset + 1];
            offset += 2;

            // SOF0 (baseline) through SOF15, excluding DHT(C4)/JPG(C8)/DAC(CC) — a real
            // encoder only ever emits one SOFn per image, and it's the one that carries
            // dimensions.
            var isSof = marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
            var segmentLength = (jpeg[offset] << 8) | jpeg[offset + 1];

            if (isSof)
            {
                var height = (jpeg[offset + 3] << 8) | jpeg[offset + 4];
                var width = (jpeg[offset + 5] << 8) | jpeg[offset + 6];
                return (width, height);
            }

            offset += segmentLength;
        }

        throw new InvalidOperationException("No SOF marker found in JPEG");
    }
}
