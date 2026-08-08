using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Output;

public record PushNotificationMessage(string Token, string Title, string Body, string? DeepLink);

public interface IPushNotificationSender
{
    Task<Result> SendAsync(PushNotificationMessage message);
}
