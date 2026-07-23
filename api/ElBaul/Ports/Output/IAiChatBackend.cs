using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Output;

public record ChatTurn(string Role, string Content);

// Secondary port for whichever LLM actually answers chat questions (currently OpenAI, see
// ElBaul.Infra/OpenAiChatBackend). Lets us swap providers without touching ChatManager.
public interface IAiChatBackend
{
    Task<Result<string>> GetReplyAsync(string systemPrompt, IEnumerable<ChatTurn> history);
}
