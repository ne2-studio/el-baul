using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace ElBaul.AcceptanceTests.CriticalJourneys;

/// <summary>
/// Request DTOs carrying an id (MovePhotoRequest.ChapterId, TagPhotosBatchRequest.PhotoIds, ...)
/// now bind straight to PhotoId/ChapterId/etc. via IdJsonConverter instead of a plain string a
/// controller parsed by hand; query values (e.g. PhotosController.GetPage's chapterId) bind via
/// IdTypeConverter. [ApiController]'s default behaviour for either kind of binding failure is a
/// ValidationProblemDetails body, not the app's `{ "error": "..." }` shape — this is the one
/// place that difference is observable, since ElBaul.Api.Tests builds the app in-process with no
/// OIDC token available to call an authenticated endpoint for real. Neither path surfaces the
/// converter's own specific message (ASP.NET substitutes one of its own generic ones instead —
/// see ElBaulApiHost.ExtractMessage's comment); what these tests guard is the shape, not the
/// wording.
/// </summary>
[Collection(AcceptanceTestCollection.Name)]
public class IdBindingTests(ElBaulAcceptanceFixture fixture)
{
    [Fact]
    public async Task An_invalid_id_in_a_JSON_request_body_still_returns_the_apps_error_shape()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);

        var response = await client.PutAsJsonAsync(
            $"/api/photos/{Guid.NewGuid()}/chapter", new { chapterId = "not-a-guid" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await AssertAppErrorShapeAsync(response);
    }

    [Fact]
    public async Task An_invalid_id_in_a_query_value_still_returns_the_apps_error_shape()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);

        // GetPage's chapterId binds via IdTypeConverter (SimpleTypeModelBinder) — a different
        // binding path from a [FromBody] property, but ASP.NET substitutes its own generic
        // message here too ("The value 'x' is not valid.") rather than the converter's.
        var response = await client.GetAsync($"/api/baules/{Guid.NewGuid()}/photos?chapterId=not-a-guid");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await AssertAppErrorShapeAsync(response);
    }

    [Fact]
    public async Task A_well_formed_id_in_a_JSON_request_body_still_binds_and_reaches_the_use_case()
    {
        using var tokenClient = fixture.CreateOidcTokenClient();
        using var client = await CreateAuthenticatedClientAsync(tokenClient, ElBaulAcceptanceFixture.OidcAdminUserKey);

        // A well-formed but non-existent chapter id: proves the string bound correctly into a
        // real ChapterId and reached PhotoManager (a NotFound from the use case, not a binding
        // failure) rather than failing to bind at all.
        var response = await client.PutAsJsonAsync(
            $"/api/photos/{Guid.NewGuid()}/chapter", new { chapterId = Guid.NewGuid().ToString() });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await ParseJsonAsync(response);
        body.GetProperty("error").GetString().Should().Contain("Photo not found");
    }

    private static async Task AssertAppErrorShapeAsync(HttpResponseMessage response)
    {
        var body = await ParseJsonAsync(response);
        body.TryGetProperty("error", out _).Should().BeTrue(
            $"an id binding failure must still come back as {{ \"error\": \"...\" }}, not ASP.NET's default ValidationProblemDetails. Body was: {body}");
        body.TryGetProperty("title", out _).Should().BeFalse("ValidationProblemDetails' shape, not this app's");
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(FakeOidcTokenClient tokenClient, string userKey)
    {
        var accessToken = await tokenClient.GetAccessTokenAsync(userKey);
        var client = new HttpClient { BaseAddress = fixture.BackendClient.BaseAddress };
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ParseJsonAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }
}
