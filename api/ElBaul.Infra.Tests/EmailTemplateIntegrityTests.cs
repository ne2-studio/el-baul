using ElBaul.Infra.Emails;
using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Infra.Tests;

/// <summary>
/// Mechanism-level tests for the Scriban email templates — distinct from
/// WelcomeEmailTemplateRendererTests/WeeklyDigestTemplateRendererTests, which cover per-branch
/// content. These check the templating machinery itself: every embedded template (including
/// Layout/Button/Footer partials) parses cleanly, and rendering a top-level email leaves no
/// unsubstituted `{{ }}` template syntax in the output.
/// </summary>
public class EmailTemplateIntegrityTests
{
    private static readonly EmailFooterLinks TestFooter = new(
        "https://el-baul.test/ayuda", "https://el-baul.test/legal/privacy-policy/", "https://el-baul.test/soporte", 2026);
    private const string TestPixelUrl = "https://el-baul.test/email/open/token.gif";
    private const string TestLogoUrl = "https://el-baul.test/email/assets/logo.png";

    [Fact]
    public void Constructing_ShouldParseEveryEmbeddedTemplate_WithoutErrors()
    {
        // ScribanEmailRenderer eagerly parses every embedded template (Layout, Button,
        // Footer, and both top-level emails, html and text) at construction and throws on the
        // first syntax error — this proves the whole set is well-formed, not just whichever
        // template a given test happens to render.
        var exception = Record.Exception(() => new ScribanEmailRenderer());
        Assert.Null(exception);
    }

    [Theory]
    [InlineData("WelcomeEmail")]
    [InlineData("WelcomeWithBaulesEmail")]
    [InlineData("WeeklyDigestEmail")]
    public async Task RenderAsync_ShouldRenderWithoutThrowing_AndLeaveNoUnsubstitutedTemplateSyntax(string template)
    {
        IEmailRenderer renderer = new ScribanEmailRenderer();
        var model = BuildModel(template);

        var result = await renderer.RenderAsync(template, model);

        Assert.False(string.IsNullOrWhiteSpace(result.Subject));
        Assert.DoesNotContain("{{", result.HtmlBody);
        Assert.DoesNotContain("}}", result.HtmlBody);
        Assert.DoesNotContain("{{", result.TextBody);
        Assert.DoesNotContain("}}", result.TextBody);
    }

    private static object BuildModel(string template) => template switch
    {
        "WelcomeEmail" => new WelcomeEmailModel(
            "Pedro", [], false, "https://el-baul.test/cta", "Crear mi primer baúl",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl),
        "WelcomeWithBaulesEmail" => new WelcomeEmailModel(
            "Pedro", ["Familia Pardal"], true, "https://el-baul.test/cta", "Añadir un recuerdo",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl),
        "WeeklyDigestEmail" => new WeeklyDigestEmailModel(
            "Pedro", true, true,
            [
                new BaulDigestSection("Familia Pardal", "https://el-baul.test/baules/1",
                    [new DigestActivityBlock(DigestBlockKind.NewChapter, "Nuevo capítulo", "https://el-baul.test/capitulos/1", 1)],
                    OverflowSummary: "Y 1 novedad más.")
            ],
            "https://el-baul.test/cta", "Añadir un recuerdo", "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl),
        _ => throw new ArgumentOutOfRangeException(nameof(template))
    };
}
