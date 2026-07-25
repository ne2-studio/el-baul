namespace ElBaul.Infra.Emails;

/// <summary>
/// Generic Scriban render abstraction, internal to ElBaul.Infra — not a Ports/Output port.
/// The public contract business code depends on is ElBaul.Ports.Output.IEmailTemplateRenderer;
/// this exists purely so that renderer's *implementation* isn't hand-built HTML.
/// </summary>
internal interface IEmailRenderer
{
    Task<ScribanRenderResult> RenderAsync<T>(string template, T model, CancellationToken cancellationToken = default);
}

/// <summary>
/// Deliberately not named "RenderedEmail" — that name is already taken by the public
/// ElBaul.Ports.Output.RenderedEmail(Subject, Html, PlainText, TemplateVersion, Locale), which
/// EmailDeliveryCoordinator/SentEmail persistence depends on. This type only carries what
/// Scriban actually produces; TemplateVersion/Locale are attached one layer up.
/// </summary>
internal sealed record ScribanRenderResult(string Subject, string HtmlBody, string TextBody);
