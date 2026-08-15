namespace ElBaul.Core.Chat.InputPorts;
public record ChatMemoryDto
(
    string Id,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
