using ElBaul.Domain;
namespace ElBaul.OutputPorts.Support;
public record SupportSubmission(
    string Category,
    string Message,
    string? TechnicalInfo,
    UserId UserId,
    string UserEmail,
    string? UserName
);
