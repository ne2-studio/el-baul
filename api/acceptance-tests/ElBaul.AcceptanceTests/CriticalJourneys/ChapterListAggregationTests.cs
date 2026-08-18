using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Exercises GET /api/baules/{baulId}/chapters against a real Postgres — the endpoint backing
/// ChapterManager.GetByBaulIdAsync, which is now served by IChapterListReadModel's EF
/// implementation (ChapterListReadModel) instead of one repository round trip per chapter.
/// ElBaul.Tests already covers the aggregation rules themselves against hand-written fakes far
/// more cheaply; the one thing only a real database can catch is whether the read model's LINQ
/// (grouping photos/recuerdos by chapter, picking each chapter's latest recuerdo, computing its
/// date range) actually translates against Postgres and returns the same shape the old
/// aggregate-by-aggregate code did — with multiple chapters in the same baúl, so a broken
/// group-by that mixed chapters up would show here.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class ChapterListAggregationTests(ElBaulAcceptanceFixture fixture)
{
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task GetChapters_aggregates_recuerdos_and_photo_dates_independently_per_chapter()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        var accessToken = await tokenClient.GetAccessTokenAsync(ElBaulAcceptanceFixture.OidcAdminUserKey);

        using var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var baulId = await CreateBaulAsync(client, "Baúl de agregación de capítulos");
        var custodioNickname = await GetCustodioNicknameAsync(client, baulId);

        // Chapter A: one dated photo (2020-05-10), no recuerdos at all.
        var chapterAId = await CreateChapterAsync(client, baulId, "Capítulo A");
        await UploadPhotoAsync(client, chapterAId, "a1.jpg", year: 2020, month: 5, day: 10);

        // Chapter B: one dated photo (2018, year only) plus one undated photo, a recuerdo on
        // the dated photo, and a later chapter-level recuerdo with no photo at all — both must
        // count and the chapter-level one (created last) must be the one that surfaces as latest.
        var chapterBId = await CreateChapterAsync(client, baulId, "Capítulo B");
        var datedPhotoId = await UploadPhotoAsync(client, chapterBId, "b1.jpg", year: 2018, month: null, day: null);
        await UploadPhotoAsync(client, chapterBId, "b2.jpg", year: null, month: null, day: null);
        await CreatePhotoRecuerdoAsync(client, datedPhotoId, "Recuerdo con foto");
        await CreateChapterRecuerdoAsync(client, baulId, chapterBId, "Recuerdo sin foto, más reciente");

        var chaptersResponse = await client.GetAsync($"/api/baules/{baulId}/chapters");
        chaptersResponse.StatusCode.Should().Be(HttpStatusCode.OK, await chaptersResponse.Content.ReadAsStringAsync());
        var chapters = (await ParseJsonAsync(chaptersResponse)).EnumerateArray().ToList();
        chapters.Should().HaveCount(2);

        // Chronological, oldest dated chapter first: B (2018) before A (2020).
        chapters[0].GetProperty("id").GetString().Should().Be(chapterBId);
        chapters[1].GetProperty("id").GetString().Should().Be(chapterAId);

        var chapterA = chapters.Single(c => c.GetProperty("id").GetString() == chapterAId);
        chapterA.GetProperty("photoCount").GetInt32().Should().Be(1);
        chapterA.GetProperty("recuerdoCount").GetInt32().Should().Be(0);
        chapterA.GetProperty("latestRecuerdoText").ValueKind.Should().Be(JsonValueKind.Null);
        chapterA.GetProperty("latestRecuerdoAuthor").ValueKind.Should().Be(JsonValueKind.Null);
        chapterA.GetProperty("minDateYear").GetInt32().Should().Be(2020);
        chapterA.GetProperty("minDateMonth").GetInt32().Should().Be(5);
        chapterA.GetProperty("minDateDay").GetInt32().Should().Be(10);
        chapterA.GetProperty("maxDateYear").GetInt32().Should().Be(2020);
        chapterA.GetProperty("undatedPhotoCount").GetInt32().Should().Be(0);

        var chapterB = chapters.Single(c => c.GetProperty("id").GetString() == chapterBId);
        chapterB.GetProperty("photoCount").GetInt32().Should().Be(2);
        // Both the photo-attached and the chapter-level, photo-less recuerdo must count.
        chapterB.GetProperty("recuerdoCount").GetInt32().Should().Be(2);
        chapterB.GetProperty("latestRecuerdoText").GetString().Should().Be("Recuerdo sin foto, más reciente");
        chapterB.GetProperty("latestRecuerdoAuthor").GetString().Should().Be(custodioNickname);
        chapterB.GetProperty("minDateYear").GetInt32().Should().Be(2018);
        chapterB.GetProperty("minDateMonth").ValueKind.Should().Be(JsonValueKind.Null);
        chapterB.GetProperty("maxDateYear").GetInt32().Should().Be(2018);
        chapterB.GetProperty("undatedPhotoCount").GetInt32().Should().Be(1);
    }

    private static async Task<string> CreateBaulAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/baules", new { name, description = (string?)null });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> GetCustodioNicknameAsync(HttpClient client, string baulId)
    {
        var response = await client.GetAsync($"/api/baules/{baulId}/personas");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var personas = await ParseJsonAsync(response);
        return personas.EnumerateArray().Single().GetProperty("nickname").GetString()!;
    }

    private static async Task<string> CreateChapterAsync(HttpClient client, string baulId, string name)
    {
        var response = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters", new { name });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    // Uploads never carry a date hint — the only date a fresh upload can get is from EXIF, which
    // these synthetic JPEGs don't have. Callers that need a dated photo apply it afterwards via
    // the live ChangeDate endpoint, exactly like a real client editing a photo's date post-upload.
    private static async Task<string> UploadPhotoAsync(HttpClient client, string chapterId, string fileName, int? year, int? month, int? day)
    {
        using var multipart = new MultipartFormDataContent();
        // Distinct bytes per call, not the same SampleJpegBytes for every upload — this suite
        // uploads several "different" photos into the same baúl, which exact-content
        // deduplication (see PhotoDuplicateMergeService) would otherwise collapse into one.
        var fileContent = new ByteArrayContent(UniqueJpegBytes(fileName));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        multipart.Add(fileContent, "File", fileName);
        multipart.Add(new StringContent(Guid.NewGuid().ToString()), "ClientUploadId");

        var response = await client.PostAsync($"/api/chapters/{chapterId}/photos", multipart);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var photoId = (await ParseJsonAsync(response)).GetProperty("id").GetString()!;

        if (year is { } y)
        {
            var dateResponse = await client.PutAsJsonAsync($"/api/photos/{photoId}/date", new { year = y, month, day });
            dateResponse.StatusCode.Should().Be(HttpStatusCode.OK, await dateResponse.Content.ReadAsStringAsync());
        }

        return photoId;
    }

    // Inserts a standard JPEG COM (comment) marker segment right after the SOI marker, carrying
    // `marker` as its payload — decoders universally ignore COM segments, so this stays a valid,
    // decodable JPEG while giving each caller genuinely different bytes (and therefore a
    // different OriginalContentHash) without maintaining a separate fixture image per test.
    private static byte[] UniqueJpegBytes(string marker)
    {
        var payload = System.Text.Encoding.ASCII.GetBytes(marker);
        var segment = new byte[4 + payload.Length];
        segment[0] = 0xFF;
        segment[1] = 0xFE; // COM marker
        var length = (ushort)(payload.Length + 2);
        segment[2] = (byte)(length >> 8);
        segment[3] = (byte)(length & 0xFF);
        Array.Copy(payload, 0, segment, 4, payload.Length);

        var result = new byte[2 + segment.Length + (SampleJpegBytes.Length - 2)];
        Array.Copy(SampleJpegBytes, 0, result, 0, 2); // SOI
        Array.Copy(segment, 0, result, 2, segment.Length);
        Array.Copy(SampleJpegBytes, 2, result, 2 + segment.Length, SampleJpegBytes.Length - 2);
        return result;
    }

    private static async Task CreatePhotoRecuerdoAsync(HttpClient client, string photoId, string text)
    {
        var response = await client.PostAsJsonAsync($"/api/photos/{photoId}/recuerdos", new { text });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    private static async Task CreateChapterRecuerdoAsync(HttpClient client, string baulId, string chapterId, string text)
    {
        var response = await client.PostAsJsonAsync($"/api/baules/{baulId}/chapters/{chapterId}/recuerdos", new { text });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
