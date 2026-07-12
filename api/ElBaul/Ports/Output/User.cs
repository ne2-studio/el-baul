namespace ElBaul.Ports.Output;

public record User
(
    string Id,
    string Email,
    string? Name,
    DateTime CreatedAt
);
