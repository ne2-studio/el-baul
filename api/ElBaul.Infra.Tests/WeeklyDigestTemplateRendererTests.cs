using System.Net;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Tests;

public class WeeklyDigestTemplateRendererTests
{
    private readonly EmailTemplateRenderer _renderer = new();

    private static WeeklyDigestEmailModel EmptyModel(bool hasBaules) => new(
        UserName: "Pedro", HasBaules: hasBaules, HasActivity: false, Sections: [],
        PrimaryCtaUrl: "https://el-baul.test/cta", PrimaryCtaLabel: "Añadir un recuerdo",
        NotificationSettingsUrl: "https://el-baul.test/perfil");

    [Fact]
    public void RenderWeeklyDigest_ShouldReportTemplateVersionLocaleAndFixedSubject()
    {
        var result = _renderer.RenderWeeklyDigest(EmptyModel(true));

        Assert.Equal("weekly-digest-v1", result.TemplateVersion);
        Assert.Equal("es-ES", result.Locale);
        Assert.Equal("Resumen semanal de tus baúles", result.Subject);
    }

    [Fact]
    public void RenderWeeklyDigest_ShouldShowTranquilMessage_WhenNoActivityButHasBaules()
    {
        var result = _renderer.RenderWeeklyDigest(EmptyModel(true));

        Assert.Contains("tranquilos", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("tranquilos", result.PlainText);
    }

    [Fact]
    public void RenderWeeklyDigest_ShouldInviteToCreateFirstBaul_WhenNoBaulesAtAll()
    {
        var model = EmptyModel(false) with { PrimaryCtaLabel = "Crear mi primer baúl" };

        var result = _renderer.RenderWeeklyDigest(model);

        Assert.Contains("Todavía no tienes ningún baúl", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("Crear mi primer baúl", WebUtility.HtmlDecode(result.Html));
    }

    [Fact]
    public void RenderWeeklyDigest_ShouldRenderOneSectionPerBaul_WithItsBlocksAndLinks()
    {
        var sections = new List<BaulDigestSection>
        {
            new("Familia Pardal", "https://el-baul.test/baules/1",
                [
                    new DigestActivityBlock(DigestBlockKind.NewChapter, "Nuevo capítulo: “Verano 1998”", "https://el-baul.test/capitulos/1", 1),
                    new DigestActivityBlock(DigestBlockKind.NewRecuerdos, "3 recuerdos nuevos", "https://el-baul.test/baules/1", 3)
                ],
                OverflowSummary: null),
            new("Familia Jimena", "https://el-baul.test/baules/2",
                [new DigestActivityBlock(DigestBlockKind.NewLoosePhotos, "6 fotos nuevas sin organizar", "https://el-baul.test/sueltas/2", 6)],
                OverflowSummary: "Y 15 fotos nuevas en 3 capítulos más.")
        };
        var model = new WeeklyDigestEmailModel(
            "Pedro", true, true, sections, "https://el-baul.test/cta", "Añadir un recuerdo", "https://el-baul.test/perfil");

        var result = _renderer.RenderWeeklyDigest(model);
        var decodedHtml = WebUtility.HtmlDecode(result.Html);

        Assert.Contains("Familia Pardal", decodedHtml);
        Assert.Contains("Familia Jimena", decodedHtml);
        Assert.Contains("Nuevo capítulo: “Verano 1998”", decodedHtml);
        Assert.Contains("3 recuerdos nuevos", decodedHtml);
        Assert.Contains("6 fotos nuevas sin organizar", decodedHtml);
        Assert.Contains("Y 15 fotos nuevas en 3 capítulos más.", decodedHtml);
        Assert.Contains("https://el-baul.test/capitulos/1", result.Html);
        Assert.Contains("Familia Pardal", result.PlainText);
        Assert.Contains("https://el-baul.test/capitulos/1", result.PlainText);
    }

    [Fact]
    public void RenderWeeklyDigest_ShouldEscapeHtmlInBaulAndBlockLabels()
    {
        var sections = new List<BaulDigestSection>
        {
            new("<script>alert(1)</script>", "https://el-baul.test/baules/1",
                [new DigestActivityBlock(DigestBlockKind.NewChapter, "<img src=x onerror=alert(1)>", "https://el-baul.test/capitulos/1", 1)],
                OverflowSummary: null)
        };
        var model = new WeeklyDigestEmailModel(
            "Pedro", true, true, sections, "https://el-baul.test/cta", "Añadir un recuerdo", "https://el-baul.test/perfil");

        var result = _renderer.RenderWeeklyDigest(model);

        Assert.DoesNotContain("<script>", result.Html);
        Assert.DoesNotContain("<img src=x", result.Html);
        Assert.Contains("&lt;script&gt;", result.Html);
        Assert.Contains("&lt;img src=x", result.Html);
    }

    [Fact]
    public void RenderWeeklyDigest_ShouldLinkToNotificationSettingsInTheFooter()
    {
        var result = _renderer.RenderWeeklyDigest(EmptyModel(true));

        Assert.Contains("https://el-baul.test/perfil", result.Html);
        Assert.Contains("configuración de notificaciones", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("https://el-baul.test/perfil", result.PlainText);
    }
}
