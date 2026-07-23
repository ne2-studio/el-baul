using ElBaul.Ports.Output;
using static VerifyXunit.Verifier;

namespace ElBaul.Infra.Tests;

/// <summary>
/// Approval tests for the welcome email's full rendered output (subject/HTML/plain-text
/// together) — a snapshot of the actual markup, unlike WelcomeEmailTemplateRendererTests'
/// targeted substring assertions. Catches any unintended change to the template (spacing,
/// structure, wording) that substring checks wouldn't notice, at the cost of needing a
/// human to review and re-approve the .verified.txt file on intentional template changes.
/// </summary>
public class WelcomeEmailApprovalTests
{
    private readonly EmailTemplateRenderer _renderer = new();

    [Fact]
    public Task RenderWelcome_WithBaules()
    {
        var model = new WelcomeEmailModel(
            UserName: "Pedro",
            BaulNames: ["Familia Pardal", "Familia Jimena"],
            HasBaules: true,
            PrimaryCtaUrl: "https://el-baul.test/baules/abc",
            PrimaryCtaLabel: "Añadir un recuerdo");

        return Verify(_renderer.RenderWelcome(model));
    }

    [Fact]
    public Task RenderWelcome_WithoutBaules()
    {
        var model = new WelcomeEmailModel(
            UserName: "Pedro",
            BaulNames: [],
            HasBaules: false,
            PrimaryCtaUrl: "https://el-baul.test/baules/nuevo",
            PrimaryCtaLabel: "Crear mi primer baúl");

        return Verify(_renderer.RenderWelcome(model));
    }

    [Fact]
    public Task RenderWelcome_WithMoreBaulesThanTheDisplayLimit()
    {
        var names = Enumerable.Range(1, 8).Select(i => $"Baúl {i}").ToList();
        var model = new WelcomeEmailModel(
            UserName: "Pedro",
            BaulNames: names,
            HasBaules: true,
            PrimaryCtaUrl: "https://el-baul.test/baules/abc",
            PrimaryCtaLabel: "Añadir un recuerdo");

        return Verify(_renderer.RenderWelcome(model));
    }

    [Fact]
    public Task RenderWelcome_WithHtmlAndUnicodeInUserControlledContent()
    {
        var model = new WelcomeEmailModel(
            UserName: "José 🎉 <script>alert(1)</script>",
            BaulNames: ["Verano en Salobreña 🏖️", "<img src=x onerror=alert(1)>"],
            HasBaules: true,
            PrimaryCtaUrl: "https://el-baul.test/baules/abc",
            PrimaryCtaLabel: "Añadir un recuerdo");

        return Verify(_renderer.RenderWelcome(model));
    }
}
