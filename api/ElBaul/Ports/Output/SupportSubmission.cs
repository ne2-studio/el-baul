namespace ElBaul.Ports.Output;

public record SupportSubmission(
    string Category,
    string Message,
    string? TechnicalInfo,
    string UserId,
    string UserEmail,
    string? UserName
);
