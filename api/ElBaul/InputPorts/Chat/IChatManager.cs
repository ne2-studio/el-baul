using ElBaul.InputPorts.Chat;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Chat;
public interface IChatManager
{
    Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(BaulId baulId);
    Task<Result<ChatMessageDto>> SendMessageAsync(BaulId baulId, string text);
    Task<Result<IEnumerable<string>>> GetSuggestedQuestionsAsync(BaulId baulId);
}
