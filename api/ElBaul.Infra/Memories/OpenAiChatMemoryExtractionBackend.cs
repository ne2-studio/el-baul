using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ElBaul.Infra.Chat;
using ElBaul.OutputPorts.Memories;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra.Memories;

// Same OpenAI chat-completions endpoint as OpenAiChatBackend, but constrained with
// response_format: json_schema (OpenAI's "structured outputs") instead of a free-text reply —
// the PRD is explicit that extraction must not rely on parsing free-form model text. Reuses
// OpenAiOptions.ApiKey/Model/BaseUrl rather than a separate config section: same account, same
// model tier is fine for this smaller, structured task.
public class OpenAiChatMemoryExtractionBackend(HttpClient httpClient, IOptions<OpenAiOptions> options, ILogger<OpenAiChatMemoryExtractionBackend> logger)
    : IChatMemoryExtractionBackend
{
    private const string SystemPrompt =
        "Analizas un único mensaje escrito por un usuario en el chat de una aplicación familiar de fotos y recuerdos " +
        "(El Baúl) para decidir si contiene información que merece recordarse en conversaciones futuras con ese mismo " +
        "usuario, en ese mismo baúl. " +
        "Busca información factual, relativamente estable en el tiempo, relacionada con la familia o el contexto del " +
        "baúl, y potencialmente útil para entender conversaciones futuras (p. ej. dónde trabajó alguien, cómo se " +
        "llama o apoda alguien, relaciones de parentesco, cómo llama la familia a un lugar). " +
        "No extraigas preguntas, instrucciones dirigidas a ti, comentarios circunstanciales, información que solo " +
        "tiene sentido en esta conversación concreta, afirmaciones tuyas, ni nada que el usuario no haya dado o " +
        "confirmado él mismo. Si el mensaje no aporta nada así, devuelve una lista de operaciones vacía. " +
        "Se te proporcionan las memorias existentes más parecidas a este mensaje (puede no haber ninguna). Si el " +
        "mensaje amplía o corrige claramente una de ellas, propón UPDATE sobre esa memoria (usando su id) en vez de " +
        "una memoria nueva casi idéntica; ante la duda, prefiere no tocar la memoria existente. Si aporta un hecho " +
        "nuevo no cubierto por ninguna memoria existente, propón ADD. Nunca propongas una memoria redundante con una " +
        "ya existente. El contenido de cada memoria debe ser una frase autocontenida en español de España.";

    private record OpenAiMessage(string Role, string Content);

    private record JsonSchemaFormat(
        string Type,
        [property: JsonPropertyName("json_schema")] JsonSchemaSpec JsonSchema);

    private record JsonSchemaSpec(string Name, bool Strict, object Schema);

    private record OpenAiRequest(
        string Model, OpenAiMessage[] Messages,
        [property: JsonPropertyName("response_format")] JsonSchemaFormat ResponseFormat);

    private record OpenAiChoice(OpenAiMessage Message);
    private record OpenAiResponse(OpenAiChoice[] Choices);

    private record ExtractedOperation(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("content")] string Content,
        [property: JsonPropertyName("existingMemoryId")] string? ExistingMemoryId);

    private record ExtractedOperations([property: JsonPropertyName("operations")] ExtractedOperation[] Operations);

    // OpenAI's "strict" structured outputs require every property listed in "required", even
    // ones that are conceptually optional — existingMemoryId models that via a nullable type
    // instead of omitting it, per OpenAI's documented pattern for optional fields under strict
    // mode.
    private static readonly object OperationsSchema = new
    {
        type = "object",
        properties = new
        {
            operations = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    properties = new
                    {
                        type = new { type = "string", @enum = new[] { "ADD", "UPDATE" } },
                        content = new { type = "string" },
                        existingMemoryId = new { type = new[] { "string", "null" } }
                    },
                    required = new[] { "type", "content", "existingMemoryId" },
                    additionalProperties = false
                }
            }
        },
        required = new[] { "operations" },
        additionalProperties = false
    };

    public async Task<Result<IReadOnlyList<ChatMemoryOperation>>> ExtractAsync(
        string userMessage, IReadOnlyList<ExistingMemoryForExtraction> similarMemories)
    {
        if (string.IsNullOrEmpty(options.Value.ApiKey))
        {
            logger.LogWarning("OpenAi:ApiKey is not configured; cannot extract chat memories");
            return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable("Chat memory extraction is not configured."));
        }

        var userPrompt = BuildUserPrompt(userMessage, similarMemories);
        var request = new OpenAiRequest(
            options.Value.Model,
            [new OpenAiMessage("system", SystemPrompt), new OpenAiMessage("user", userPrompt)],
            new JsonSchemaFormat("json_schema", new JsonSchemaSpec("chat_memory_operations", true, OperationsSchema)));

        // JsonContent.Create serializes with camelCase-by-default naming, which correctly
        // produces "model"/"messages"/"role"/"content" for the plain records above — but not
        // the two snake_case OpenAI field names (response_format, json_schema), hence the
        // explicit JsonPropertyName overrides on those two properties.

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
                logger.LogError("OpenAI chat memory extraction failed {StatusCode} {Body}", response.StatusCode, body);
                return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable($"OpenAI returned {response.StatusCode}"));
            }

            var payload = await response.Content.ReadFromJsonAsync<OpenAiResponse>();
            var rawJson = payload?.Choices.FirstOrDefault()?.Message.Content;
            if (string.IsNullOrEmpty(rawJson))
            {
                logger.LogError("OpenAI chat memory extraction response contained no content");
                return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable("OpenAI response contained no reply"));
            }

            var extracted = JsonSerializer.Deserialize<ExtractedOperations>(rawJson);
            if (extracted is null)
            {
                logger.LogError("OpenAI chat memory extraction response had an unexpected shape");
                return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable("OpenAI response had an unexpected shape"));
            }

            IReadOnlyList<ChatMemoryOperation> operations = extracted.Operations
                .Select(ToOperation)
                .Where(op => op is not null)
                .Select(op => op!)
                .ToList();

            return Result.Success(operations);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "OpenAI chat memory extraction request failed");
            return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable("Failed to extract chat memories."));
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "OpenAI chat memory extraction returned a malformed response body");
            return Result.Failure<IReadOnlyList<ChatMemoryOperation>>(ApplicationError.ExternalDependencyUnavailable("OpenAI response had an unexpected shape"));
        }
    }

    private static ChatMemoryOperation? ToOperation(ExtractedOperation raw) =>
        raw.Type.Equals("UPDATE", StringComparison.OrdinalIgnoreCase)
            ? new ChatMemoryOperation(ChatMemoryOperationType.Update, raw.Content, raw.ExistingMemoryId)
            : raw.Type.Equals("ADD", StringComparison.OrdinalIgnoreCase)
                ? new ChatMemoryOperation(ChatMemoryOperationType.Add, raw.Content, null)
                : null;

    private static string BuildUserPrompt(string userMessage, IReadOnlyList<ExistingMemoryForExtraction> similarMemories)
    {
        var lines = new List<string> { $"Mensaje del usuario: \"{userMessage}\"", "" };

        if (similarMemories.Count == 0)
        {
            lines.Add("Memorias existentes más parecidas: ninguna.");
        }
        else
        {
            lines.Add("Memorias existentes más parecidas:");
            lines.AddRange(similarMemories.Select(m => $"- id={m.Id}: \"{m.Content}\""));
        }

        return string.Join('\n', lines);
    }
}
