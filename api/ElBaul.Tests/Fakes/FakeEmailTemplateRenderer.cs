using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

/// <summary>
/// Deterministic stand-in for the real (Infra) HTML renderer — WelcomeEmailManagerTests
/// exercises eligibility/idempotency/orchestration, not markup, so a real renderer would
/// only add noise. Captures the last model it was asked to render for assertions.
/// </summary>
public class FakeEmailTemplateRenderer : IEmailTemplateRenderer
{
    public WelcomeEmailModel? LastModel { get; private set; }

    public RenderedEmail RenderWelcome(WelcomeEmailModel model)
    {
        LastModel = model;
        return new RenderedEmail(
            "Bienvenido a El Baúl",
            $"<html>{model.PrimaryCtaLabel}:{model.PrimaryCtaUrl}</html>",
            $"{model.PrimaryCtaLabel}: {model.PrimaryCtaUrl}",
            "welcome-v1",
            "es-ES");
    }
}
