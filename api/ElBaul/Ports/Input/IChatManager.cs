using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IChatManager
{
    Task<Result<IEnumerable<ChatMessageDto>>> GetMessagesAsync(Guid baulId);
    Task<Result<ChatMessageDto>> SendMessageAsync(Guid baulId, string text);
}
