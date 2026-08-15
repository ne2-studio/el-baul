namespace ElBaul.Core.Chat;
public record ChatMessageDto
(
    string Id,
    string Role,
    string Content,
    DateTime CreatedAt
);
