using System.Net;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace ElBaul.Infra.Tests;

public class LeadHubSupportBackendTests
{
    private const string SubmitPath = "/api/forms/el-baul-ayuda/submit";

    private static readonly SupportSubmission Submission =
        new("Bug", "Se ha caído la app", "Mozilla/5.0", "user-1", "user@example.com", "Usuaria");

    private static IConfiguration BuildConfiguration(string? submitUrl) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(submitUrl is null
                ? []
                : new Dictionary<string, string?> { ["Support:LeadHub:SubmitUrl"] = submitUrl })
            .Build();

    private static LeadHubSupportBackend CreateBackend(string? submitUrl) =>
        new(
            new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }),
            BuildConfiguration(submitUrl),
            Substitute.For<ILogger<LeadHubSupportBackend>>());

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_WhenLeadHubRespondsWithSuccess()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(SubmitPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));
        var backend = CreateBackend($"{server.Url}{SubmitPath}");

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_WhenLeadHubRespondsWithARedirectToTheThankYouPage()
    {
        // LeadHub redirects to a "thanks" page on success; we don't follow it (no
        // Location header guaranteed, and we have no use for the page itself) —
        // the redirect status alone is treated as success.
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(SubmitPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.MovedPermanently));
        var backend = CreateBackend($"{server.Url}{SubmitPath}");

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldPostFieldsAsMultipartFormData()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(SubmitPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));
        var backend = CreateBackend($"{server.Url}{SubmitPath}");

        await backend.SubmitAsync(Submission);

        var logEntry = Assert.Single(server.LogEntries);
        var request = logEntry.RequestMessage!;
        Assert.Equal("POST", request.Method);
        Assert.Equal(SubmitPath, request.Path);
        Assert.StartsWith("multipart/form-data", request.Headers!["Content-Type"].ToString());
        var body = request.Body!;
        Assert.Contains("Se ha caído la app", body);
        Assert.Contains("user@example.com", body);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenLeadHubRespondsWithAnErrorStatus()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(SubmitPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.InternalServerError));
        var backend = CreateBackend($"{server.Url}{SubmitPath}");

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenTheHttpCallThrows()
    {
        // Start a real server to obtain a genuine loopback port, then stop it before
        // calling — nothing listens there anymore, so the HttpClient gets a real
        // connection-refused HttpRequestException, same as a network-level failure in production.
        var server = WireMockServer.Start();
        var submitUrl = $"{server.Url}{SubmitPath}";
        server.Stop();
        var backend = CreateBackend(submitUrl);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenSubmitUrlIsNotConfigured()
    {
        var backend = CreateBackend(submitUrl: null);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }
}
