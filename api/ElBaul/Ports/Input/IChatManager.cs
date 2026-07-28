using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IChatManager
{
    Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(BaulId baulId);
    Task<Result<ChatMessageDto>> SendMessageAsync(BaulId baulId, string text);
    Task<Result<IEnumerable<string>>> GetSuggestedQuestionsAsync(BaulId baulId);
}
