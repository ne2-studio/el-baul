using Ne2Studio.Common;

namespace ElBaul.Core.Notifications.OutputPorts;
public record PushNotificationMessage(string Token, string Title, string Body, string? DeepLink);

public interface IPushNotificationSender
{
    Task<Result> SendAsync(PushNotificationMessage message);
}
