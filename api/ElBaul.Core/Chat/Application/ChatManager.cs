using ElBaul.Core.Shared.Application;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Chat.Application;
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
    ISuggestedQuestionsStrategy suggestedQuestionsStrategy,
    IBackgroundJobScheduler backgroundJobScheduler) : IChatManager
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

    // Keeps both the history shown in the UI and the history sent to the model bounded to a
    // single recent sitting, instead of an ever-growing thread: old chat turns about a baúl that
    // has since gained new recuerdos/capítulos are more likely to mislead the model (and clutter
    // the UI) than to help — the baúl content itself, not old chat, is the durable memory store.
    private const int MaxHistoryMessages = 10;
    private static readonly TimeSpan MaxHistoryAge = TimeSpan.FromHours(24);

    private IEnumerable<ChatMessage> RecentMessages(IEnumerable<ChatMessage> messages)
    {
        var cutoff = clock.UtcNow() - MaxHistoryAge;
        // messages arrives oldest-first; TakeLast after the cutoff filter keeps that order while
        // keeping the most recent MaxHistoryMessages of them.
        return messages.Where(m => m.CreatedAt >= cutoff).TakeLast(MaxHistoryMessages);
    }

    private string BuildSystemInstruction(Persona? interlocutor)
    {
        // Without this, the model sees who wrote past recuerdos but has no way to tell which
        // family member is on the other end of the current message — it reads as if it doesn't
        // know who it's talking to.
        var interlocutorLine = interlocutor is not null
            ? $"Estás hablando ahora mismo con {interlocutor.Nickname}."
            : "No se ha podido identificar con certeza a la persona con la que hablas ahora mismo.";
        return SystemInstruction + $"\n\nHoy es {clock.UtcNow():yyyy-MM-dd}. {interlocutorLine}";
    }

    public async Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(BaulId baulId)
    {
        if (!appConfiguration.ChatEnabled)
            return Result.Failure<IEnumerable<ChatMessageDto>>(ApplicationError.Validation("Chat is not enabled"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chat messages");
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChatMessageDto>>(auth.Error);

        var messages = await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId);
        return Result.Success(RecentMessages(messages).Select(ToDto));
    }

    public async Task<Result<ChatMessageDto>> SendMessageAsync(BaulId baulId, string text)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Chat message rejected: chat is not enabled");
            return Result.Failure<ChatMessageDto>(ApplicationError.Validation("Chat is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chat message");
        if (auth.IsFailure) return Result.Failure<ChatMessageDto>(auth.Error);
        var baul = auth.Value.Baul;

        var now = clock.UtcNow();
        var userMessage = new ChatMessage(idGenerator.NewId(), baulId, userId, ChatMessageRole.User, text, now);
        // Deliberately not wrapped in IUnitOfWork.ExecuteInTransactionAsync with the assistant
        // reply below (see that port's doc comment) — NOT because the re-read a few lines down
        // wouldn't see this message otherwise (a transaction always sees its own prior writes;
        // that part would work fine either way). The real reason: the LLM call sits between the
        // two writes and can take several seconds, and a real DB transaction must never be held
        // open across slow external I/O like that — it ties up a connection and any locks it
        // holds for the duration. Two independent commits, with the LLM call in between holding
        // no transaction at all, is the correct shape here, not a workaround.
        await chatMessageRepository.CreateAsync(userMessage);

        // Fire-and-forget from this request's point of view: extraction runs as its own
        // Hangfire job (see ChatMemoryExtractionManager), never awaited here, so a slow or
        // failing extractor never delays or fails this chat turn's reply.
        if (appConfiguration.ChatMemoryEnabled)
            backgroundJobScheduler.EnqueueChatMemoryExtraction(baulId, userId, userMessage.Id, text);

        var systemPrompt = BuildSystemInstruction(auth.Value.Persona) + "\n\n" + await chatContextBuilder.BuildAsync(baul, userId, text);
        var history = RecentMessages(await chatMessageRepository.GetByBaulAndUserAsync(baulId, userId))
            .Select(m => new ChatTurn(m.Role.ToApiString(), m.Content));

        var replyResult = await aiChatBackend.GetReplyAsync(systemPrompt, history);
        if (replyResult.IsFailure)
        {
            logger.LogError("Chat reply failed {Error}", replyResult.Error);
            return Result.Failure<ChatMessageDto>(replyResult.Error);
        }

        var assistantMessage = new ChatMessage(
            idGenerator.NewId(), baulId, userId, ChatMessageRole.Assistant, replyResult.Value, clock.UtcNow());
        await chatMessageRepository.CreateAsync(assistantMessage);

        logger.LogInformation("Chat message answered {ChatMessageId}", assistantMessage.Id);
        return ToDto(assistantMessage);
    }

    public async Task<Result<IEnumerable<string>>> GetSuggestedQuestionsAsync(BaulId baulId)
    {
        if (!appConfiguration.ChatEnabled)
        {
            logger.LogWarning("Suggested questions rejected: chat is not enabled");
            return Result.Failure<IEnumerable<string>>(ApplicationError.Validation("Chat is not enabled"));
        }

        if (!appConfiguration.ChatSuggestionsEnabled)
        {
            logger.LogWarning("Suggested questions rejected: chat suggestions are not enabled");
            return Result.Failure<IEnumerable<string>>(ApplicationError.Validation("Chat suggestions are not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Suggested questions");
        if (auth.IsFailure) return Result.Failure<IEnumerable<string>>(auth.Error);

        var result = await suggestedQuestionsStrategy.GenerateAsync(auth.Value.Baul);
        if (result.IsFailure)
            logger.LogError("Suggested questions failed {Error}", result.Error);

        return result;
    }

    private static ChatMessageDto ToDto(ChatMessage message) =>
        new(message.Id.ToString(), message.Role.ToApiString(), message.Content, message.CreatedAt);
}
