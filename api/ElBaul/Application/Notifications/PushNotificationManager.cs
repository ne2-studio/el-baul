using ElBaul.Application.Notifications;
using ElBaul.InputPorts.Notifications;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Application.Notifications;
public class PushNotificationManager(
    IPushTokenRepository pushTokenRepository,
    IPushNotificationSender pushNotificationSender,
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

        foreach (var pushToken in tokens)
        {
            var notification = new PushNotificationMessage(pushToken.Token, TestNotificationTitle, message, deepLink);
            var result = await pushNotificationSender.SendAsync(notification);
            if (result.IsFailure)
                return result;
        }

        return Result.Success();
    }
}
