using CSharpFunctionalExtensions;

namespace ElBaul.OutputPorts.Notifications;
public record PushNotificationMessage(string Token, string Title, string Body, string? DeepLink);

public interface IPushNotificationSender
{
    Task<Result> SendAsync(PushNotificationMessage message);
}
