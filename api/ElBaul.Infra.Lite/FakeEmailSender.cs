using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class FakeEmailSender : IEmailSender
{
    public List<EmailMessage> SentMessages { get; } = [];
    public Result<EmailSendResult> NextResult { get; set; } = new EmailSendResult("fake-message-id");

    public Task<Result<EmailSendResult>> SendAsync(EmailMessage message)
    {
        SentMessages.Add(message);
        return Task.FromResult(NextResult);
    }
}
