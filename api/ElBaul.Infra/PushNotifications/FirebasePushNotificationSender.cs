using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
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
            Data = message.DeepLink is null ? null : new Dictionary<string, string> { ["deepLink"] = message.DeepLink }
        };

        try
        {
            await _messaging.SendAsync(fcmMessage);
            return Result.Success();
        }
        catch (FirebaseMessagingException ex)
        {
            _logger.LogError(ex, "Firebase push send failed {Token} {ErrorCode}", message.Token, ex.MessagingErrorCode);
            return Result.Failure($"Firebase returned {ex.MessagingErrorCode}");
        }
    }
}
