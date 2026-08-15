using ElBaul.Domain;
namespace ElBaul.Core.Support.OutputPorts;
public record SupportSubmission(
    string Category,
    string Message,
    string? TechnicalInfo,
    UserId UserId,
    string UserEmail,
    string? UserName
);
