using System.Net.Mail;
using ElBaul.OutputPorts.Notifications;
using ElBaul.Shared;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra.Emails;

// Local-dev adapter: relays through Mailpit (docker-compose's `mailpit` service, web UI at
// http://localhost:8025) so emails can be inspected in a real inbox instead of just reading
// HTML out of console logs. ServiceRegistration only wires this in when Smtp:Host is
// configured — docker-compose.yaml sets it for local dev; it's never set in Production, where
// ResendEmailSender takes over.
public class SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task<Result<EmailSendResult>> SendAsync(EmailMessage message)
    {
        var replyTo = string.IsNullOrEmpty(options.Value.ReplyToAddress)
            ? options.Value.FromAddress
            : options.Value.ReplyToAddress;

        using var mail = new MailMessage
        {
            From = new MailAddress(options.Value.FromAddress, options.Value.FromName),
            Subject = message.Subject,
            Body = message.PlainText,
            IsBodyHtml = false
        };
        mail.ReplyToList.Add(new MailAddress(replyTo));
        mail.To.Add(message.To);
        mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(message.Html, null, "text/html"));

        using var client = new SmtpClient(options.Value.Host, options.Value.Port);

        try
        {
            await client.SendMailAsync(mail);
            return new EmailSendResult($"mailpit-{Guid.NewGuid()}");
        }
        catch (SmtpException ex)
        {
            logger.LogError(ex, "SMTP send failed {To} {Host}:{Port}", message.To, options.Value.Host, options.Value.Port);
            return Result.Failure<EmailSendResult>(ApplicationError.ExternalDependencyUnavailable("Failed to send email via SMTP"));
        }
    }
}
