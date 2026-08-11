using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Chat;
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
