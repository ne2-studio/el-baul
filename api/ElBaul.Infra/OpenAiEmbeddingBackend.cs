using System.Net.Http.Headers;
using System.Net.Http.Json;
using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra;

public class OpenAiEmbeddingBackend(HttpClient httpClient, IOptions<OpenAiOptions> options, ILogger<OpenAiEmbeddingBackend> logger)
    : IEmbeddingBackend
{
    private record OpenAiEmbeddingRequest(string Model, string[] Input);
    private record OpenAiEmbeddingData(float[] Embedding, int Index);
    private record OpenAiEmbeddingResponse(OpenAiEmbeddingData[] Data);

    public string ModelId => options.Value.EmbeddingModel;

    public async Task<Result<float[]>> EmbedAsync(string text)
    {
        var result = await EmbedManyAsync([text]);
        return result.IsSuccess ? Result.Success(result.Value[0]) : Result.Failure<float[]>(result.Error);
    }

    public async Task<Result<IReadOnlyList<float[]>>> EmbedManyAsync(IReadOnlyList<string> texts)
    {
        if (string.IsNullOrEmpty(options.Value.ApiKey))
        {
            logger.LogWarning("OpenAi:ApiKey is not configured; cannot get embeddings");
            return Result.Failure<IReadOnlyList<float[]>>("Chat is not configured.");
        }

        var request = new OpenAiEmbeddingRequest(options.Value.EmbeddingModel, texts.ToArray());

        try
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.Value.ApiKey);

            using var response = await httpClient.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogError("OpenAI embeddings request failed {StatusCode} {Body}", response.StatusCode, body);
                return Result.Failure<IReadOnlyList<float[]>>($"OpenAI returned {response.StatusCode}");
            }

            var payload = await response.Content.ReadFromJsonAsync<OpenAiEmbeddingResponse>();
            if (payload is null || payload.Data.Length != texts.Count)
            {
                logger.LogError("OpenAI embeddings response had an unexpected shape");
                return Result.Failure<IReadOnlyList<float[]>>("OpenAI embeddings response had an unexpected shape");
            }

            // The API guarantees results in request order via Index, but sort explicitly
            // rather than trust that ordering holds.
            var vectors = payload.Data.OrderBy(d => d.Index).Select(d => d.Embedding).ToList();
            return Result.Success<IReadOnlyList<float[]>>(vectors);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OpenAI embeddings request failed");
            return Result.Failure<IReadOnlyList<float[]>>("Failed to get embeddings from the AI.");
        }
    }
}
