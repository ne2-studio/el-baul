using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
using ElBaul.Core.Notifications.Domain;
namespace ElBaul.Core.Notifications.Application;
public class PushNotificationManager(
    IPushTokenRepository pushTokenRepository,
    IPushNotificationSender pushNotificationSender,
    ISentPushNotificationRepository sentPushNotificationRepository,
    IPushLinkSigner pushLinkSigner,
    ICurrentUserProvider currentUserProvider,
    IIdGenerator idGenerator,
    IClock clock) : IPushNotificationManager
{
    private const string TestNotificationTitle = "Prueba de El Baúl";

    public async Task<Result> RegisterTokenAsync(string token, string platform)
    {
        var userId = currentUserProvider.GetUserId();
        var pushToken = new PushToken(idGenerator.NewId(), userId, token, platform, clock.UtcNow());
        await pushTokenRepository.UpsertAsync(pushToken);
        return Result.Success();
    }

    public async Task<Result> UnregisterTokenAsync(string token)
    {
        var userId = currentUserProvider.GetUserId();
        await pushTokenRepository.DeleteAsync(userId, token);
        return Result.Success();
    }

    public async Task<Result> SendTestNotificationAsync(UserId targetUserId, string message, string? deepLink)
    {
        var tokens = (await pushTokenRepository.GetTokensForUserAsync(targetUserId)).ToList();
        if (tokens.Count == 0)
            return Result.Failure(ApplicationError.Validation("This user has no registered device"));

        var now = clock.UtcNow();
        var notificationId = idGenerator.NewId();
        var pendingNotification = new SentPushNotification(
            notificationId, targetUserId, PushNotificationType.Test, TestNotificationTitle, message,
            PushNotificationStatus.Pending, $"test-push:{targetUserId}:{notificationId}", now,
            DeepLink: deepLink);
        await sentPushNotificationRepository.TryReserveAsync(pendingNotification);
        var trackingToken = pushLinkSigner.CreateOpenToken(pendingNotification.Id);

        foreach (var pushToken in tokens)
        {
            var notification = new PushNotificationMessage(pushToken.Token, TestNotificationTitle, message, deepLink, trackingToken);
            var result = await pushNotificationSender.SendAsync(notification);
            if (result.IsFailure)
            {
                await sentPushNotificationRepository.UpdateAsync(pendingNotification.MarkFailed(result.Error.Message));
                return result;
            }
        }

        await sentPushNotificationRepository.UpdateAsync(pendingNotification.MarkSent("Firebase", clock.UtcNow()));
        return Result.Success();
    }
}
