using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra;

/// <summary>
/// Stand-in for ResendEmailSender when Resend:ApiKey isn't configured (local/dev, no real
/// Resend account yet) — logs the composed email and reports success with a fake message id,
/// so the rest of the pipeline (SentEmail persistence, admin history, status) can be
/// exercised end-to-end without a provider.
/// </summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task<Result<EmailSendResult>> SendAsync(EmailMessage message)
    {
        logger.LogInformation(
            "Email not sent (Resend:ApiKey not configured) — logging instead. To: {To}, Subject: {Subject}\n{PlainText}",
            message.To, message.Subject, message.PlainText);

        return Task.FromResult(Result.Success(new EmailSendResult($"dev-{Guid.NewGuid()}")));
    }
}
