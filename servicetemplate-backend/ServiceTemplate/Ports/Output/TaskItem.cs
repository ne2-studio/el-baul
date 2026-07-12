namespace ServiceTemplate.Ports.Output;

public record TaskItem
(
    Guid Id,
    string UserId,
    string Title,
    DateTime CreatedAt
);
