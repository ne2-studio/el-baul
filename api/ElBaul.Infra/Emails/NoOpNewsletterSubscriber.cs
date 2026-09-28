using ElBaul.Core.Notifications.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.Emails;

/// <summary>
/// Stand-in for ResendNewsletterSubscriber when Resend:ApiKey and/or Resend:NewsletterAudienceId
/// aren't configured (local/dev, or a Resend account with no newsletter audience set up yet) —
/// logs the would-be subscription and reports success, so the caller (UserSyncMiddleware) is
/// never coupled to whether newsletter subscription is actually wired up.
/// </summary>
public class NoOpNewsletterSubscriber(ILogger<NoOpNewsletterSubscriber> logger) : INewsletterSubscriber
{
    public Task<Result> SubscribeAsync(string email, string? firstName)
    {
        logger.LogInformation(
            "Newsletter subscription skipped (Resend:ApiKey/Resend:NewsletterAudienceId not configured) for {Email}", email);

        return Task.FromResult(Result.Success());
    }
}
