using System.Net;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace ElBaul.Infra.Tests;

public class OpenAiChatBackendTests
{
    private const string ChatPath = "/v1/chat/completions";

    private static readonly ChatTurn[] History = [new("user", "¿Qué recuerdos hay de las vacaciones?")];

    private static OpenAiChatBackend CreateBackend(string baseUrl, string apiKey = "sk-test") =>
        new(
            new HttpClient(),
            Options.Create(new OpenAiOptions { ApiKey = apiKey, Model = "gpt-4o-mini", BaseUrl = baseUrl }),
            Substitute.For<ILogger<OpenAiChatBackend>>());

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WithoutHittingTheNetwork_WhenApiKeyIsNotConfigured()
    {
        using var server = WireMockServer.Start();
        var backend = CreateBackend(server.Url!, apiKey: "");

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
        Assert.Empty(server.LogEntries);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WhenOpenAiRespondsWithAnErrorStatus()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.TooManyRequests).WithBody("rate limited"));
        var backend = CreateBackend(server.Url!);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WhenResponseBodyIsEmpty()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));
        var backend = CreateBackend(server.Url!);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WhenResponseBodyIsMalformedJson()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBody("{not-json"));
        var backend = CreateBackend(server.Url!);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WhenResponseHasNoChoices()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new { choices = Array.Empty<object>() }));
        var backend = CreateBackend(server.Url!);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldFail_WhenTheHttpCallThrows()
    {
        var server = WireMockServer.Start();
        var baseUrl = server.Url!;
        server.Stop();
        var backend = CreateBackend(baseUrl);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldReturnTheReply_WhenOpenAiRespondsSuccessfully()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                choices = new[]
                {
                    new { message = new { role = "assistant", content = "Aquí tienes tus recuerdos de las vacaciones." } }
                }
            }));
        var backend = CreateBackend(server.Url!);

        var result = await backend.GetReplyAsync("Eres un asistente.", History);

        Assert.True(result.IsSuccess);
        Assert.Equal("Aquí tienes tus recuerdos de las vacaciones.", result.Value);
    }

    [Fact]
    public async Task GetReplyAsync_ShouldSendTheSystemPromptAndHistoryWithBearerAuth()
    {
        using var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath(ChatPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK).WithBodyAsJson(new
            {
                choices = new[] { new { message = new { role = "assistant", content = "ok" } } }
            }));
        var backend = CreateBackend(server.Url!, apiKey: "sk-secret");

        await backend.GetReplyAsync("Eres un asistente.", History);

        var request = Assert.Single(server.LogEntries).RequestMessage!;
        Assert.Equal("Bearer sk-secret", request.Headers!["Authorization"].ToString());
        Assert.Contains("Eres un asistente.", request.Body);
        Assert.Contains("recuerdos hay de las vacaciones", request.Body);
    }
}
