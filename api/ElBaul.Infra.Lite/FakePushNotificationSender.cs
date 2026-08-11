using ElBaul.OutputPorts.Notifications;
using ElBaul.Shared;
namespace ElBaul.Infra.Lite;

public class FakePushNotificationSender : IPushNotificationSender
{
    private readonly Lock _lock = new();

    public List<PushNotificationMessage> SentMessages { get; } = [];
    public Result NextResult { get; set; } = Result.Success();

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration) — see
    // FakeEmailSender's doc comment for why the list add needs the lock.
    public Task<Result> SendAsync(PushNotificationMessage message)
    {
        lock (_lock) SentMessages.Add(message);
        return Task.FromResult(NextResult);
    }
}
