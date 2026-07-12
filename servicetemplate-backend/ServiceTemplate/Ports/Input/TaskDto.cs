namespace ServiceTemplate.Ports.Input;

public record TaskDto
(
    string Id,
    string Title,
    DateTime CreatedAt
);
