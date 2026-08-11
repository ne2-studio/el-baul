using CSharpFunctionalExtensions;
using ElBaul.OutputPorts.Notifications;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.PushNotifications;

/// <summary>
/// Stand-in for FirebasePushNotificationSender when Firebase:ServiceAccountJson isn't
/// configured (local/dev, no real Firebase credentials yet) — logs the composed notification
/// and reports success, so the rest of the pipeline (token registration, admin test-send) can
/// be exercised end-to-end without a provider.
/// </summary>
public class LoggingPushNotificationSender(ILogger<LoggingPushNotificationSender> logger) : IPushNotificationSender
{
    public Task<Result> SendAsync(PushNotificationMessage message)
    {
        logger.LogInformation(
            "Push not sent (Firebase:ServiceAccountJson not configured) — logging instead. " +
            "Token: {Token}, Title: {Title}, DeepLink: {DeepLink}\n{Body}",
            message.Token, message.Title, message.DeepLink, message.Body);

        return Task.FromResult(Result.Success());
    }
}
