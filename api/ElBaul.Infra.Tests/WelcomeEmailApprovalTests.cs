using ElBaul.Infra.Emails;
using ElBaul.Core.Notifications.OutputPorts;

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
    private static readonly EmailFooterLinks TestFooter = new(
        "https://el-baul.test/ayuda", "https://el-baul.test/legal/privacy-policy/", "https://el-baul.test/soporte", 2026);
    private const string TestPixelUrl = "https://el-baul.test/email/open/token.gif";
    private const string TestLogoUrl = "https://el-baul.test/email/assets/logo.png";
    private const string TestVideoUrl = "https://el-baul.test/email/click/video-token";
    private const string TestVideoThumbnailUrl = "https://el-baul.test/email/assets/onboarding-video-thumbnail.jpg";

    private readonly EmailTemplateRenderer _renderer = new(new ScribanEmailRenderer());

    [Fact]
    public Task RenderWelcome_WithBaules()
    {
        var model = new WelcomeEmailModel(
            UserName: "Pedro",
            BaulNames: ["Familia Pardal", "Familia Jimena"],
            HasBaules: true,
            PrimaryCtaUrl: "https://el-baul.test/baules/abc",
            PrimaryCtaLabel: "Entrar en Familia Pardal",
            NotificationSettingsUrl: "https://el-baul.test/perfil",
            Footer: TestFooter,
            PixelUrl: TestPixelUrl,
            LogoUrl: TestLogoUrl,
            VideoUrl: TestVideoUrl,
            VideoThumbnailUrl: TestVideoThumbnailUrl);

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
            PrimaryCtaLabel: "Empezar mi baúl",
            NotificationSettingsUrl: "https://el-baul.test/perfil",
            Footer: TestFooter,
            PixelUrl: TestPixelUrl,
            LogoUrl: TestLogoUrl,
            VideoUrl: TestVideoUrl,
            VideoThumbnailUrl: TestVideoThumbnailUrl);

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
            PrimaryCtaLabel: "Entrar en Verano en Salobreña 🏖️",
            NotificationSettingsUrl: "https://el-baul.test/perfil",
            Footer: TestFooter,
            PixelUrl: TestPixelUrl,
            LogoUrl: TestLogoUrl,
            VideoUrl: TestVideoUrl,
            VideoThumbnailUrl: TestVideoThumbnailUrl);

        return Verify(_renderer.RenderWelcome(model));
    }
}
