namespace ElBaul.Ports.Output;

public enum ChatMessageRole
{
    User,
    Assistant
}

public record ChatMessage
(
    Guid Id,
    BaulId BaulId,
    string UserId,
    ChatMessageRole Role,
    string Content,
    DateTime CreatedAt
);
