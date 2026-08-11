using ElBaul.Domain;
namespace ElBaul.OutputPorts.Notifications;
public record PushToken
(
    Guid Id,
    UserId UserId,
    string Token,
    string Platform,
    DateTime CreatedAt
);
