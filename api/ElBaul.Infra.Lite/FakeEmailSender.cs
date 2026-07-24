using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class FakeEmailSender : IEmailSender
{
    private readonly Lock _lock = new();

    public List<EmailMessage> SentMessages { get; } = [];
    public Result<EmailSendResult> NextResult { get; set; } = new EmailSendResult("fake-message-id");

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its
    // use in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add
    // is not safe under concurrent writers.
    public Task<Result<EmailSendResult>> SendAsync(EmailMessage message)
    {
        lock (_lock) SentMessages.Add(message);
        return Task.FromResult(NextResult);
    }
}
