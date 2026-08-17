using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Infra.Emails;

internal class EmailTemplateRenderer(IEmailRenderer emailRenderer) : IEmailTemplateRenderer
{
    public const string WelcomeTemplateVersion = "welcome-v1";
    public const string DigestTemplateVersion = "weekly-digest-v1";
    public const string Locale = "es-ES";

    public RenderedEmail RenderWelcome(WelcomeEmailModel model)
    {
        // Two distinct templates share one WelcomeEmailModel and one EmailType.Welcome —
        // "already received the welcome email" tracking (EmailDeliveryCoordinator's dedup
        // key, SentEmailRepository.GetUserIdsWithSentEmailAsync) must stay indifferent to
        // which copy a user got, so the split happens only here, at render time.
        var templateName = model.HasBaules ? "WelcomeWithBaulesEmail" : "WelcomeEmail";

        // RenderAsync never actually awaits I/O (templates are pre-parsed embedded
        // resources) — GetAwaiter().GetResult() is safe here specifically because of that;
        // don't copy this pattern onto a renderer that does real async work.
        var result = emailRenderer.RenderAsync(templateName, model).GetAwaiter().GetResult();
        return new RenderedEmail(result.Subject, result.HtmlBody, result.TextBody, WelcomeTemplateVersion, Locale);
    }

    public RenderedEmail RenderWeeklyDigest(WeeklyDigestEmailModel model)
    {
        var result = emailRenderer.RenderAsync("WeeklyDigestEmail", model).GetAwaiter().GetResult();
        return new RenderedEmail(result.Subject, result.HtmlBody, result.TextBody, DigestTemplateVersion, Locale);
    }
}
