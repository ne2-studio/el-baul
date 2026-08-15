using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
public enum ChatMessageRole
{
    User,
    Assistant
}

public record ChatMessage
(
    Guid Id,
    BaulId BaulId,
    UserId UserId,
    ChatMessageRole Role,
    string Content,
    DateTime CreatedAt
);
