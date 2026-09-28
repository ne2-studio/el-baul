using ElBaul.Core.Notifications.OutputPorts;
using Ne2Studio.Common;

namespace ElBaul.Infra.Lite;

public class FakeNewsletterSubscriber : INewsletterSubscriber
{
    private readonly Lock _lock = new();

    public List<(string Email, string? FirstName)> SubscribedContacts { get; } = [];
    public Result NextResult { get; set; } = Result.Success();

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its use
    // in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add is not
    // safe under concurrent writers.
    public Task<Result> SubscribeAsync(string email, string? firstName)
    {
        lock (_lock) SubscribedContacts.Add((email, firstName));
        return Task.FromResult(NextResult);
    }
}
