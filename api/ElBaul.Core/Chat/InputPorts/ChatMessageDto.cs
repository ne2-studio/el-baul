namespace ElBaul.Core.Chat.InputPorts;
public record ChatMessageDto
(
    string Id,
    string Role,
    string Content,
    DateTime CreatedAt
);
