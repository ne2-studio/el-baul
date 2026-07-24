using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class ChatManager(
    ILogger<ChatManager> logger,
    IBaulRepository baulRepository,
    IChatMessageRepository chatMessageRepository,
    IAiChatBackend aiChatBackend,
    IAppConfiguration appConfiguration,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IChatContextBuilder chatContextBuilder) : IChatManager
{
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

        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null) return Result.Failure<IEnumerable<ChatMessageDto>>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<ChatMessageDto>>("Access denied");

        var messages = await chatMessageRepository.GetByBaulAndUserAsync(id, userId);
        return Result.Success(messages.Select(ToDto));
    }

    public async Task<Result<ChatMessageDto>> SendMessageAsync(Guid baulId, string text)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Chat message rejected: chat is not enabled {BaulId}", baulId);
            return Result.Failure<ChatMessageDto>("Chat is not enabled");
        }

        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
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
        var userMessage = new ChatMessage(idGenerator.NewId(), id, userId, ChatMessageRole.User, text, now);
        await chatMessageRepository.CreateAsync(userMessage);

        var systemPrompt = SystemInstruction + "\n\n" + await chatContextBuilder.BuildAsync(baul, text);
        var history = (await chatMessageRepository.GetByBaulAndUserAsync(id, userId))
            .Select(m => new ChatTurn(m.Role.ToApiString(), m.Content));

        var replyResult = await aiChatBackend.GetReplyAsync(systemPrompt, history);
        if (replyResult.IsFailure)
        {
            logger.LogError("Chat reply failed {BaulId} {Error}", baulId, replyResult.Error);
            return Result.Failure<ChatMessageDto>(replyResult.Error);
        }

        var assistantMessage = new ChatMessage(
            idGenerator.NewId(), id, userId, ChatMessageRole.Assistant, replyResult.Value, clock.UtcNow());
        await chatMessageRepository.CreateAsync(assistantMessage);

        logger.LogInformation("Chat message answered {BaulId} {ChatMessageId}", baulId, assistantMessage.Id);
        return ToDto(assistantMessage);
    }

    private static ChatMessageDto ToDto(ChatMessage message) =>
        new(message.Id.ToString(), message.Role.ToApiString(), message.Content, message.CreatedAt);
}
