using Ne2Studio.Common;

namespace ElBaul.Core.Notifications.OutputPorts;

/// <summary>
/// Subscribes a user to the marketing newsletter audience (Resend, in the real adapter). Kept
/// separate from IEmailSender since it's a different concern (audience membership vs. sending a
/// single transactional/marketing email), even though the real adapter shares the same provider
/// and API key.
/// </summary>
public interface INewsletterSubscriber
{
    Task<Result> SubscribeAsync(string email, string? firstName);
}
