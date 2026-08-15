using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Notifications.InputPorts;
public interface IPushNotificationManager
{
    Task<Result> RegisterTokenAsync(string token, string platform);
    Task<Result> UnregisterTokenAsync(string token);

    /// <summary>Admin-only debug tool: sends one ad-hoc push to every device the target user has
    /// registered. Fails with Validation if the user has no registered device.</summary>
    Task<Result> SendTestNotificationAsync(UserId targetUserId, string message, string? deepLink);
}
