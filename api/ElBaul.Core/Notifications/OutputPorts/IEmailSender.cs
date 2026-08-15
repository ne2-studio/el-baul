using Ne2Studio.Common;

namespace ElBaul.Core.Notifications.OutputPorts;
public record EmailMessage(string To, string Subject, string Html, string PlainText);

public record EmailSendResult(string ProviderMessageId);

public interface IEmailSender
{
    Task<Result<EmailSendResult>> SendAsync(EmailMessage message);
}
