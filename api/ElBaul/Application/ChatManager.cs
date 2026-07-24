using System.Text;
using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class ChatManager(
    ILogger<ChatManager> logger,
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IRecuerdoRepository recuerdoRepository,
    IChatMessageRepository chatMessageRepository,
    IRecuerdoEmbeddingRepository recuerdoEmbeddingRepository,
    IAiChatBackend aiChatBackend,
    IEmbeddingBackend embeddingBackend,
    IAppConfiguration appConfiguration,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IChatManager
{
    // Only the recuerdos most relevant to the current question are sent to the model — see
    // FindRelevantRecuerdosAsync. Keeps the prompt (and its cost) bounded regardless of how
    // much a baúl has grown, instead of dumping every recuerdo on every message.
    private const int MaxRelevantRecuerdos = 20;

    // Fixed instruction, not user-editable in this walking skeleton — HU-01 only, no writing
    // assistance, no persona, no tools. The baúl content is appended verbatim below it.
    private const string SystemInstruction =
        "Eres un asistente que ayuda a una familia a recordar su propia historia. " +
        "Responde únicamente basándote en la información del baúl familiar que se te proporciona a continuación. " +
        "Si la respuesta no está en esa información, dilo claramente en vez de inventar. " +
        "Cuando sea posible, menciona en tu respuesta el recuerdo o capítulo del que proviene la información.";

    public async Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(Guid baulId)
    {
        if (!appConfiguration.ChatEnabled) return Result.Failure<IEnumerable<ChatMessageDto>>("Chat is not enabled");

        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<ChatMessageDto>>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<ChatMessageDto>>("Access denied");

        var messages = await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId);
        return Result.Success(messages.Select(ToDto));
    }

    public async Task<Result<ChatMessageDto>> SendMessageAsync(Guid baulId, string text)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Chat message rejected: chat is not enabled {BaulId}", baulId);
            return Result.Failure<ChatMessageDto>("Chat is not enabled");
        }

        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Chat message rejected: baul not found {BaulId}", baulId);
            return Result.Failure<ChatMessageDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Chat message rejected: access denied {BaulId}", baulId);
            return Result.Failure<ChatMessageDto>("Access denied");
        }

        var now = clock.UtcNow();
        var userMessage = new ChatMessage(idGenerator.NewId(), baulId, userId, ChatMessageRole.User, text, now);
        await chatMessageRepository.CreateAsync(userMessage);

        var systemPrompt = SystemInstruction + "\n\n" + await BuildRelevantContextAsync(baulId, text);
        var history = (await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId))
            .Select(m => new ChatTurn(m.Role.ToApiString(), m.Content));

        var replyResult = await aiChatBackend.GetReplyAsync(systemPrompt, history);
        if (replyResult.IsFailure)
        {
            logger.LogError("Chat reply failed {BaulId} {Error}", baulId, replyResult.Error);
            return Result.Failure<ChatMessageDto>(replyResult.Error);
        }

        var assistantMessage = new ChatMessage(
            idGenerator.NewId(), baulId, userId, ChatMessageRole.Assistant, replyResult.Value, clock.UtcNow());
        await chatMessageRepository.CreateAsync(assistantMessage);

        logger.LogInformation("Chat message answered {BaulId} {ChatMessageId}", baulId, assistantMessage.Id);
        return ToDto(assistantMessage);
    }

    // Volcado en texto plano del contenido del baúl relevante para la pregunta. Baúl, personas
    // y capítulos entran siempre (listas pequeñas, acotadas por el tamaño de la familia); los
    // recuerdos se acotan a los más similares a la pregunta — ver FindRelevantRecuerdosAsync.
    private async Task<string> BuildRelevantContextAsync(Guid baulId, string query)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        var chapters = (await chapterRepository.GetByBaulIdAsync(baulId)).ToList();
        var chapterNames = chapters.ToDictionary(a => a.Id, a => a.Name);
        var personas = (await baulRepository.GetPersonasAsync(baulId)).ToList();
        var nicknamesByUserId = personas
            .Where(s => s.UserId is not null)
            .ToDictionary(s => s.UserId!, s => s.Nickname);
        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(baulId)).ToList();
        var relevantRecuerdos = await FindRelevantRecuerdosAsync(baulId, recuerdos, query);

        var sb = new StringBuilder();
        sb.AppendLine($"Nombre del baúl: {baul?.Name}");
        if (!string.IsNullOrWhiteSpace(baul?.Description))
            sb.AppendLine($"Descripción del baúl: {baul.Description}");

        sb.AppendLine();
        sb.AppendLine("Personas de la familia en este baúl:");
        foreach (var persona in personas)
            sb.AppendLine($"- {persona.Nickname}" + (persona.Name is { Length: > 0 } ? $" ({persona.Name})" : ""));

        sb.AppendLine();
        sb.AppendLine("Capítulos:");
        foreach (var chapter in chapters)
            sb.AppendLine($"- {chapter.Name} ({chapter.PhotoCount} fotos)");

        sb.AppendLine();
        if (relevantRecuerdos.Count < recuerdos.Count)
        {
            // Told explicitly, so the model doesn't confuse "not shown to me" with "doesn't
            // exist" and hallucinate a confident "no tenemos esa información".
            sb.AppendLine(
                $"Recuerdos más relevantes para esta pregunta ({relevantRecuerdos.Count} de {recuerdos.Count} " +
                "recuerdos en total en el baúl — puede haber más recuerdos no mostrados aquí por no ser tan " +
                "relevantes para esta pregunta en concreto):");
        }
        else
        {
            sb.AppendLine("Recuerdos (ordenados del más antiguo al más reciente):");
        }

        foreach (var recuerdo in relevantRecuerdos.OrderBy(r => r.CreatedAt))
        {
            var author = nicknamesByUserId.GetValueOrDefault(recuerdo.UserId, "Usuario");
            var chapterName = recuerdo.ChapterId is { } chapterId ? chapterNames.GetValueOrDefault(chapterId) : null;
            var location = chapterName is not null ? $", capítulo: {chapterName}" : "";
            sb.AppendLine($"- [{recuerdo.CreatedAt:yyyy-MM-dd}] {author}: \"{recuerdo.Text}\"{location}");
        }

        return sb.ToString();
    }

    // Real RAG, no vector database: embeddings are computed lazily (the first time a recuerdo
    // is needed for ranking) and cached in RecuerdoEmbeddings; similarity is brute-force cosine
    // in memory, which is plenty fast at a single family's baúl scale. If a baúl ever grows
    // large enough for that to matter, that's the point to reach for pgvector/ANN — not before.
    private async Task<List<Recuerdo>> FindRelevantRecuerdosAsync(Guid baulId, List<Recuerdo> recuerdos, string query)
    {
        if (recuerdos.Count <= MaxRelevantRecuerdos) return recuerdos;

        var embeddingsByRecuerdoId = (await recuerdoEmbeddingRepository.GetByBaulIdAsync(baulId))
            .ToDictionary(e => e.RecuerdoId);

        var stale = recuerdos
            .Where(r => !embeddingsByRecuerdoId.TryGetValue(r.Id, out var existing) || existing.Model != embeddingBackend.ModelId)
            .ToList();

        if (stale.Count > 0)
        {
            var embedResult = await embeddingBackend.EmbedManyAsync(stale.Select(r => r.Text).ToList());
            if (embedResult.IsSuccess)
            {
                var now = clock.UtcNow();
                var newEmbeddings = stale.Zip(embedResult.Value,
                    (recuerdo, vector) => new RecuerdoEmbedding(recuerdo.Id, baulId, vector, embeddingBackend.ModelId, now)).ToList();
                await recuerdoEmbeddingRepository.CreateManyAsync(newEmbeddings);
                foreach (var embedding in newEmbeddings)
                    embeddingsByRecuerdoId[embedding.RecuerdoId] = embedding;
            }
            else
            {
                logger.LogWarning(
                    "Could not embed {Count} recuerdos, ranking with what's already indexed {BaulId} {Error}",
                    stale.Count, baulId, embedResult.Error);
            }
        }

        var queryEmbeddingResult = await embeddingBackend.EmbedAsync(query);
        if (queryEmbeddingResult.IsFailure)
        {
            // Ranking isn't possible, but the chat turn shouldn't fail just because of that —
            // fall back to the most recent recuerdos instead.
            logger.LogWarning("Could not embed the query, falling back to most recent recuerdos {BaulId}", baulId);
            return recuerdos.OrderByDescending(r => r.CreatedAt).Take(MaxRelevantRecuerdos).ToList();
        }

        return recuerdos
            .Where(r => embeddingsByRecuerdoId.ContainsKey(r.Id))
            .OrderByDescending(r => CosineSimilarity(embeddingsByRecuerdoId[r.Id].Vector, queryEmbeddingResult.Value))
            .Take(MaxRelevantRecuerdos)
            .ToList();
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        double dot = 0, normA = 0, normB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dot / (Math.Sqrt(normA) * Math.Sqrt(normB) + 1e-9);
    }

    private static ChatMessageDto ToDto(ChatMessage message) =>
        new(message.Id.ToString(), message.Role.ToApiString(), message.Content, message.CreatedAt);
}
