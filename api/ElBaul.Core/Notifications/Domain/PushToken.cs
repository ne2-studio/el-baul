using ElBaul.Domain;
namespace ElBaul.Core.Notifications.Domain;
public record PushToken
(
    Guid Id,
    UserId UserId,
    string Token,
    string Platform,
    DateTime CreatedAt
);
