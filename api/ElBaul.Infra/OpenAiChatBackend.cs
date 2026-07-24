using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra;

public class OpenAiChatBackend(HttpClient httpClient, IOptions<OpenAiOptions> options, ILogger<OpenAiChatBackend> logger)
    : IAiChatBackend
{
    private record OpenAiMessage(string Role, string Content);
    private record OpenAiRequest(string Model, OpenAiMessage[] Messages);
    private record OpenAiChoice(OpenAiMessage Message);
    private record OpenAiResponse(OpenAiChoice[] Choices);

    public async Task<Result<string>> GetReplyAsync(string systemPrompt, IEnumerable<ChatTurn> history)
    {
        if (string.IsNullOrEmpty(options.Value.ApiKey))
        {
            logger.LogWarning("OpenAi:ApiKey is not configured; cannot get a chat reply");
            return Result.Failure<string>("Chat is not configured.");
        }

        var messages = new List<OpenAiMessage> { new("system", systemPrompt) };
        messages.AddRange(history.Select(t => new OpenAiMessage(t.Role, t.Content)));

        var request = new OpenAiRequest(options.Value.Model, messages.ToArray());

        try
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{options.Value.BaseUrl}/v1/chat/completions")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.ApiKey);

            using var response = await httpClient.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogError("OpenAI chat completion failed {StatusCode} {Body}", response.StatusCode, body);
                return Result.Failure<string>($"OpenAI returned {response.StatusCode}");
            }

            var payload = await response.Content.ReadFromJsonAsync<OpenAiResponse>();
            var reply = payload?.Choices.FirstOrDefault()?.Message.Content;
            if (string.IsNullOrEmpty(reply))
            {
                logger.LogError("OpenAI response contained no reply");
                return Result.Failure<string>("OpenAI response contained no reply");
            }

            return reply;
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OpenAI chat completion failed");
            return Result.Failure<string>("Failed to get a reply from the AI.");
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "OpenAI chat completion returned a malformed response body");
            return Result.Failure<string>("OpenAI response contained no reply");
        }
    }
}
