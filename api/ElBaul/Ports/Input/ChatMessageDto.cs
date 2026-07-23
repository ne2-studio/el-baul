namespace ElBaul.Ports.Input;

public record ChatMessageDto
(
    string Id,
    string Role,
    string Content,
    DateTime CreatedAt
);
