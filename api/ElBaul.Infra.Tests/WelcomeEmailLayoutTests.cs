using ElBaul.Infra.Emails;
using ElBaul.OutputPorts.Notifications;
namespace ElBaul.Infra.Tests;

/// <summary>
/// Lighter-weight companion to WelcomeEmailApprovalTests' full-snapshot diffing — checks
/// specifically that the shared Layout wrapper and Footer component are always present,
/// independent of which content branch renders.
/// </summary>
public class WelcomeEmailLayoutTests
{
    private static readonly EmailFooterLinks TestFooter = new(
        "https://el-baul.test/ayuda", "https://el-baul.test/legal/privacy-policy/", "https://el-baul.test/soporte", 2026);
    private const string TestPixelUrl = "https://el-baul.test/email/open/token.gif";
    private const string TestLogoUrl = "https://el-baul.test/email/assets/logo.png";

    private readonly EmailTemplateRenderer _renderer = new(new ScribanEmailRenderer());

    [Fact]
    public void RenderWelcome_ShouldAlwaysIncludeTheSharedLayoutWrapper()
    {
        var model = new WelcomeEmailModel(
            "Pedro", [], false, "https://el-baul.test/cta", "Crear mi primer baúl",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl);

        var result = _renderer.RenderWelcome(model);

        Assert.Contains("<!doctype html>", result.Html);
        Assert.Contains("<html lang=\"es\">", result.Html);
        Assert.Contains("</html>", result.Html);
    }

    [Fact]
    public void RenderWelcome_ShouldAlwaysIncludeTheFooterComponent()
    {
        var model = new WelcomeEmailModel(
            "Pedro", [], false, "https://el-baul.test/cta", "Crear mi primer baúl",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl);

        var result = _renderer.RenderWelcome(model);

        Assert.Contains("Conserva la historia de tu familia.", result.Html);
        Assert.Contains(TestFooter.HelpCenterUrl, result.Html);
        Assert.Contains("Conserva la historia de tu familia.", result.PlainText);
    }

    [Fact]
    public void RenderWelcome_ShouldAlwaysIncludeTheOpenTrackingPixel()
    {
        var model = new WelcomeEmailModel(
            "Pedro", [], false, "https://el-baul.test/cta", "Crear mi primer baúl",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl);

        var result = _renderer.RenderWelcome(model);

        Assert.Contains($"<img src=\"{TestPixelUrl}\"", result.Html);
        Assert.DoesNotContain(TestPixelUrl, result.PlainText);
    }

    [Fact]
    public void RenderWelcome_ShouldReferenceTheLogoByUrl_NotEmbedItInline()
    {
        var model = new WelcomeEmailModel(
            "Pedro", [], false, "https://el-baul.test/cta", "Crear mi primer baúl",
            "https://el-baul.test/perfil", TestFooter, TestPixelUrl, TestLogoUrl);

        var result = _renderer.RenderWelcome(model);

        Assert.Contains($"<img src=\"{TestLogoUrl}\"", result.Html);
        Assert.DoesNotContain("data:image/png;base64,", result.Html);
    }
}
