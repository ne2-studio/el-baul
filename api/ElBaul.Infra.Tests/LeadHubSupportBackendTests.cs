using System.Net;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace ElBaul.Infra.Tests;

public class LeadHubSupportBackendTests
{
    private static readonly SupportSubmission Submission =
        new("Bug", "Se ha caído la app", "Mozilla/5.0", "user-1", "user@example.com", "Usuaria");

    private static IConfiguration BuildConfiguration(string? submitUrl = "https://leadhub.test/api/forms/el-baul-ayuda/submit") =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(submitUrl is null
                ? []
                : new Dictionary<string, string?> { ["Support:LeadHub:SubmitUrl"] = submitUrl })
            .Build();

    private static LeadHubSupportBackend CreateBackend(HttpMessageHandler handler, IConfiguration? configuration = null) =>
        new(new HttpClient(handler), configuration ?? BuildConfiguration(), Substitute.For<ILogger<LeadHubSupportBackend>>());

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_WhenLeadHubRespondsWithSuccess()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var backend = CreateBackend(handler);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldSucceed_WhenLeadHubRespondsWithARedirectToTheThankYouPage()
    {
        // LeadHub redirects to a "thanks" page on success; we don't follow it (no
        // Location header guaranteed, and we have no use for the page itself) —
        // the redirect status alone is treated as success.
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.MovedPermanently));
        var backend = CreateBackend(handler);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SubmitAsync_ShouldPostFieldsAsMultipartFormData()
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;
        var handler = new StubHttpMessageHandler(request =>
        {
            capturedRequest = request;
            capturedBody = request.Content!.ReadAsStringAsync().Result;
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var backend = CreateBackend(handler);

        await backend.SubmitAsync(Submission);

        Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
        Assert.Equal("https://leadhub.test/api/forms/el-baul-ayuda/submit", capturedRequest.RequestUri!.ToString());
        Assert.StartsWith("multipart/form-data", capturedRequest.Content!.Headers.ContentType!.ToString());
        Assert.Contains("Se ha caído la app", capturedBody);
        Assert.Contains("user@example.com", capturedBody);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenLeadHubRespondsWithAnErrorStatus()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var backend = CreateBackend(handler);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenTheHttpCallThrows()
    {
        var handler = new StubHttpMessageHandler(_ => throw new HttpRequestException("boom"));
        var backend = CreateBackend(handler);

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task SubmitAsync_ShouldFail_WhenSubmitUrlIsNotConfigured()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var backend = CreateBackend(handler, BuildConfiguration(submitUrl: null));

        var result = await backend.SubmitAsync(Submission);

        Assert.True(result.IsFailure);
    }

    private class StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
