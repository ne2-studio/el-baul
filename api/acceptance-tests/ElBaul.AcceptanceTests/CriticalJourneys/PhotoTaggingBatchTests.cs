using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// PhotoPersonaTagManager.AddTaggedPersonasBatchAsync used to fetch/write each photo's tags one
/// at a time; it now goes through IPhotoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync and
/// SetTagsForManyAsync — a GroupBy-after-Where-Contains read and an ExecuteDeleteAsync-then-
/// AddRange write, both new EF-translated shapes for this repository. ElBaul.Tests' batch-tagging
/// coverage runs against InMemoryPhotoPersonaTagRepository, which never executes that SQL — this
/// is the one place it can be proven against a real database.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class PhotoTaggingBatchTests(ElBaulAcceptanceFixture fixture)
{
    private static readonly byte[] SampleJpegBytes = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=");

    [Fact]
    public async Task AddTaggedPersonasBatchAsync_tags_every_photo_and_preserves_each_photos_pre_existing_tags()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var adminClient = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);

        var baulId = await CreateBaulAsync(adminClient, "Baúl de etiquetado por lotes");
        var chapterId = await CreateChapterAsync(adminClient, baulId, "Capítulo de etiquetado");

        var personaAId = await CreatePersonaAsync(adminClient, baulId, "Persona A");
        var personaBId = await CreatePersonaAsync(adminClient, baulId, "Persona B");

        var photo1Id = await UploadPhotoAsync(adminClient, chapterId, "batch1.jpg");
        var photo2Id = await UploadPhotoAsync(adminClient, chapterId, "batch2.jpg");

        // photo1 already has personaA tagged before the batch call — SetTagsForManyAsync must
        // still fold that pre-existing tag into photo1's resulting set, exactly like the
        // per-photo SetTagsAsync it replaces, while photo2 starts with no tags at all.
        await TagBatchAsync(adminClient, baulId, [photo1Id], [personaAId]);

        await TagBatchAsync(adminClient, baulId, [photo1Id, photo2Id], [personaBId]);

        var photo1Tags = await GetTaggedPersonaIdsAsync(adminClient, photo1Id);
        photo1Tags.Should().BeEquivalentTo([personaAId, personaBId], "the pre-existing tag on photo1 must survive the batch call");

        var photo2Tags = await GetTaggedPersonaIdsAsync(adminClient, photo2Id);
        photo2Tags.Should().BeEquivalentTo([personaBId]);
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

    private static async Task<string> CreatePersonaAsync(HttpClient client, string baulId, string nickname)
    {
        var response = await client.PostAsJsonAsync($"/api/baules/{baulId}/personas", new { nickname });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> UploadPhotoAsync(HttpClient client, string chapterId, string fileName)
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
        return (await ParseJsonAsync(response)).GetProperty("id").GetString()!;
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

    private static async Task TagBatchAsync(HttpClient client, string baulId, IReadOnlyList<string> photoIds, IReadOnlyList<string> personaIds)
    {
        var response = await client.PutAsJsonAsync("/api/photos/tag-batch", new { baulId, photoIds, personaIds });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    private static async Task<List<string>> GetTaggedPersonaIdsAsync(HttpClient client, string photoId)
    {
        var response = await client.GetAsync($"/api/photos/{photoId}/personas");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var json = await ParseJsonAsync(response);
        return json.EnumerateArray().Select(p => p.GetProperty("id").GetString()!).ToList();
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
