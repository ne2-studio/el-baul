using ElBaul.Core.Notifications.OutputPorts;
using Ne2Studio.Common;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra.PushNotifications;

/// <summary>
/// Singleton: wraps a single FirebaseMessaging client backed by one FirebaseApp, which the
/// Firebase Admin SDK documents as safe to reuse across concurrent sends — same deliberate
/// exception to the default Scoped lifetime as MinioPhotoStorage (a pooled external SDK
/// client, not request state).
/// </summary>
public class FirebasePushNotificationSender : IPushNotificationSender
{
    // Named (not default) FirebaseApp so a second instantiation within the same process (e.g.
    // re-running composition in a test host) can look the app up instead of hitting
    // FirebaseApp.Create's "already exists" exception.
    private const string AppName = "el-baul-push";

    private readonly FirebaseMessaging _messaging;
    private readonly ILogger<FirebasePushNotificationSender> _logger;

    public FirebasePushNotificationSender(IOptions<FirebaseOptions> options, ILogger<FirebasePushNotificationSender> logger)
    {
        _logger = logger;
        var credential = CredentialFactory.FromJson<ServiceAccountCredential>(options.Value.ServiceAccountJson).ToGoogleCredential();
        var app = FirebaseApp.GetInstance(AppName) ?? FirebaseApp.Create(new AppOptions { Credential = credential }, AppName);
        _messaging = FirebaseMessaging.GetMessaging(app);
    }

    public async Task<Result> SendAsync(PushNotificationMessage message)
    {
        var fcmMessage = new Message
        {
            // Message.Token (not the newer Fid) is what @capacitor/push-notifications'
            // `register()` actually hands the client — a classic FCM registration token, not
            // a Firebase Installation ID. Obsolete but still functional; switch when the
            // client side moves to FIDs.
#pragma warning disable CS0618
            Token = message.Token,
#pragma warning restore CS0618
            Notification = new Notification { Title = message.Title, Body = message.Body },
            Data = BuildData(message)
        };

        try
        {
            await _messaging.SendAsync(fcmMessage);
            return Result.Success();
        }
        catch (FirebaseMessagingException ex)
        {
            _logger.LogError(ex, "Firebase push send failed {Token} {ErrorCode}", message.Token, ex.MessagingErrorCode);
            return Result.Failure(ApplicationError.ExternalDependencyUnavailable($"Firebase returned {ex.MessagingErrorCode}"));
        }
    }

    // Both deepLink and trackingToken travel as data fields, not in the Notification block —
    // the client reads them off event.notification.data in PushNotificationsHandler, the same
    // way the tap listener already reads deepLink today.
    private static Dictionary<string, string>? BuildData(PushNotificationMessage message)
    {
        if (message.DeepLink is null && message.TrackingToken is null) return null;

        var data = new Dictionary<string, string>();
        if (message.DeepLink is not null) data["deepLink"] = message.DeepLink;
        if (message.TrackingToken is not null) data["trackingToken"] = message.TrackingToken;
        return data;
    }
}
