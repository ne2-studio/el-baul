using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class ChatManager(
    ILogger<ChatManager> logger,
    IChatMessageRepository chatMessageRepository,
    IAiChatBackend aiChatBackend,
    IAppConfiguration appConfiguration,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IChatContextBuilder chatContextBuilder,
    ISuggestedQuestionsStrategy suggestedQuestionsStrategy) : IChatManager
{
    // Fixed instruction, not user-editable in this walking skeleton — HU-01 only, no writing
    // assistance, no persona, no tools. The baúl content is appended verbatim below it.
    private const string SystemInstruction =
        "Eres un asistente que ayuda a una familia a recordar su propia historia. " +
        "Responde únicamente basándote en la información del baúl familiar que se te proporciona a continuación. " +
        "Si la respuesta no está en esa información, dilo claramente en vez de inventar. " +
        "Esto último solo aplica cuando el usuario te ha hecho una pregunta explícita: si en cambio simplemente " +
        "comparte un comentario, una anécdota o un recuerdo sin preguntar nada, no respondas que no lo sabes; " +
        "sigue la conversación de forma natural, como en una charla familiar, con una pregunta de seguimiento " +
        "que le ayude a recordar más detalles. " +
        "Cuando sea posible, menciona en tu respuesta el recuerdo o capítulo del que proviene la información. " +
        "Termina siempre tu respuesta con una pregunta que invite a seguir la conversación y ayude a enriquecer el " +
        "baúl: si no tenías suficiente información para responder, pide al usuario que te la cuente él mismo; si " +
        "sí la tenías, pídele que profundice en ese recuerdo. " +
        "Responde siempre en español de España.";

    private string BuildSystemInstruction() =>
        SystemInstruction + $"\n\nHoy es {clock.UtcNow():yyyy-MM-dd}.";

    public async Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(BaulId baulId)
    {
        if (!appConfiguration.ChatEnabled)
            return Result.Failure<IEnumerable<ChatMessageDto>>(ApplicationError.Validation("Chat is not enabled"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chat messages", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChatMessageDto>>(auth.Error);

        var messages = await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId);
        return Result.Success(messages.Select(ToDto));
    }

    public async Task<Result<ChatMessageDto>> SendMessageAsync(BaulId baulId, string text)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Chat message rejected: chat is not enabled {BaulId}", baulId);
            return Result.Failure<ChatMessageDto>(ApplicationError.Validation("Chat is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chat message", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<ChatMessageDto>(auth.Error);
        var baul = auth.Value.Baul;

        var now = clock.UtcNow();
        var userMessage = new ChatMessage(idGenerator.NewId(), baulId, userId, ChatMessageRole.User, text, now);
        await chatMessageRepository.CreateAsync(userMessage);

        var systemPrompt = BuildSystemInstruction() + "\n\n" + await chatContextBuilder.BuildAsync(baul, text);
        var history = (await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId))
            .Select(m => new ChatTurn(m.Role.ToApiString(), m.Content));

        var replyResult = await aiChatBackend.GetReplyAsync(systemPrompt, history);
        if (replyResult.IsFailure)
        {
            logger.LogError("Chat reply failed {BaulId} {Error}", baulId, replyResult.Error);
            return Result.Failure<ChatMessageDto>(ApplicationError.ExternalDependencyUnavailable(replyResult.Error));
        }

        var assistantMessage = new ChatMessage(
            idGenerator.NewId(), baulId, userId, ChatMessageRole.Assistant, replyResult.Value, clock.UtcNow());
        await chatMessageRepository.CreateAsync(assistantMessage);

        logger.LogInformation("Chat message answered {BaulId} {ChatMessageId}", baulId, assistantMessage.Id);
        return ToDto(assistantMessage);
    }

    public async Task<Result<IEnumerable<string>>> GetSuggestedQuestionsAsync(BaulId baulId)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Suggested questions rejected: chat is not enabled {BaulId}", baulId);
            return Result.Failure<IEnumerable<string>>(ApplicationError.Validation("Chat is not enabled"));
        }

        if (!appConfiguration.ChatSuggestionsEnabled)
        {
            logger.LogWarning("Suggested questions rejected: chat suggestions are not enabled {BaulId}", baulId);
            return Result.Failure<IEnumerable<string>>(ApplicationError.Validation("Chat suggestions are not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Suggested questions", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<string>>(auth.Error);

        var result = await suggestedQuestionsStrategy.GenerateAsync(auth.Value.Baul);
        if (result.IsFailure)
            logger.LogError("Suggested questions failed {BaulId} {Error}", baulId, result.Error);

        return result;
    }

    private static ChatMessageDto ToDto(ChatMessage message) =>
        new(message.Id.ToString(), message.Role.ToApiString(), message.Content, message.CreatedAt);
}
