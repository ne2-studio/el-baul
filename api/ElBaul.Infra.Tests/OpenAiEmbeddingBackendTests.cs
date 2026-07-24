using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace ElBaul.Infra.Tests;

public class OpenAiEmbeddingBackendTests
{
    private const string EmbeddingsPath = "/v1/embeddings";

    private static OpenAiEmbeddingBackend CreateBackend(string baseUrl, string apiKey = "sk-test") =>
        new(
            new HttpClient(),
            Options.Create(new OpenAiOptions { ApiKey = apiKey, EmbeddingModel = "text-embedding-3-small", BaseUrl = baseUrl }),
            Substitute.For<ILogger<OpenAiEmbeddingBackend>>());

    [Fact]
    public void ModelId_ShouldReturnTheConfiguredEmbeddingModel()
    {
        var backend = CreateBackend("https://unused.test");

        Assert.Equal("text-embedding-3-small", backend.ModelId);
    }

    [Fact]
    public async Task EmbedAsync_ShouldFail_WithoutHittingTheNetwork_WhenApiKeyIsNotConfigured()
    {
        using var server = WireMockServer.Start();
        var backend = CreateBackend(server.Url!, apiKey: "");

        var result = await backend.EmbedAsync("hola");

        Assert.True(result.IsFailure);
        Assert.Empty(server.LogEntries);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldFail_WhenOpenAiRespondsWithAnErrorStatus()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.Unauthorized).WithBody("invalid api key"));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedManyAsync(["hola", "adiós"]);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldFail_WhenResponseBodyIsEmpty()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedManyAsync(["hola"]);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldFail_WhenResponseBodyIsMalformedJson()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBody("{not-json"));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedManyAsync(["hola"]);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldFail_WhenResponseHasFewerEmbeddingsThanRequestedTexts()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                data = new[] { new { embedding = new[] { 0.1f, 0.2f }, index = 0 } }
            }));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedManyAsync(["hola", "adiós"]);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldFail_WhenTheHttpCallThrows()
    {
        var server = WireMockServer.Start();
        var baseUrl = server.Url!;
        server.Stop();
        var backend = CreateBackend(baseUrl);

        var result = await backend.EmbedManyAsync(["hola"]);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task EmbedManyAsync_ShouldReturnVectorsInRequestOrder_RegardlessOfResponseOrder()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                data = new[]
                {
                    new { embedding = new[] { 0.9f, 0.9f }, index = 1 },
                    new { embedding = new[] { 0.1f, 0.1f }, index = 0 },
                }
            }));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedManyAsync(["hola", "adiós"]);

        Assert.True(result.IsSuccess);
        Assert.Equal([0.1f, 0.1f], result.Value[0]);
        Assert.Equal([0.9f, 0.9f], result.Value[1]);
    }

    [Fact]
    public async Task EmbedAsync_ShouldReturnASingleVector_WhenOpenAiRespondsSuccessfully()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                data = new[] { new { embedding = new[] { 0.3f, 0.4f }, index = 0 } }
            }));
        var backend = CreateBackend(server.Url!);

        var result = await backend.EmbedAsync("hola");

        Assert.True(result.IsSuccess);
        Assert.Equal([0.3f, 0.4f], result.Value);
    }

    [Fact]
    public async Task EmbedAsync_ShouldSendTheModelAndTextWithBearerAuth()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(EmbeddingsPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                data = new[] { new { embedding = new[] { 0.1f }, index = 0 } }
            }));
        var backend = CreateBackend(server.Url!, apiKey: "sk-secret");

        await backend.EmbedAsync("hola mundo");

        var request = Assert.Single(server.LogEntries).RequestMessage!;
        Assert.Equal("Bearer sk-secret", request.Headers!["Authorization"].ToString());
        Assert.Contains("text-embedding-3-small", request.Body);
        Assert.Contains("hola mundo", request.Body);
    }
}
