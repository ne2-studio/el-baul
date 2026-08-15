using ElBaul.Domain;
namespace ElBaul.Core.Notifications.OutputPorts;
public record PushToken
(
    Guid Id,
    UserId UserId,
    string Token,
    string Platform,
    DateTime CreatedAt
);
