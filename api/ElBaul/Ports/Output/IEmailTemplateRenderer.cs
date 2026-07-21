namespace ElBaul.Ports.Output;

public record RenderedEmail(string Subject, string Html, string PlainText, string TemplateVersion, string Locale);

public record WelcomeEmailModel(
    string UserName,
    IReadOnlyList<string> BaulNames,
    bool HasBaules,
    string PrimaryCtaUrl,
    string PrimaryCtaLabel);

/// <summary>
/// Turns an email content model into subject/HTML/plain-text — kept separate from
/// IEmailSender so template generation can be unit-tested and previewed without sending
/// anything, and from the Application layer that builds the model so HTML/escaping
/// concerns stay out of business logic.
/// </summary>
public interface IEmailTemplateRenderer
{
    RenderedEmail RenderWelcome(WelcomeEmailModel model);
}
