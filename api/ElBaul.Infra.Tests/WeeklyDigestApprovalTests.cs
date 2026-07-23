using ElBaul.Ports.Output;
using static VerifyXunit.Verifier;

namespace ElBaul.Infra.Tests;

/// <summary>
/// Approval tests for the weekly digest email's full rendered output (subject/HTML/plain-text
/// together) — a snapshot of the actual markup, unlike WeeklyDigestTemplateRendererTests'
/// targeted substring assertions. Catches any unintended change to the template (spacing,
/// structure, wording) that substring checks wouldn't notice, at the cost of needing a
/// human to review and re-approve the .verified.txt file on intentional template changes.
/// </summary>
public class WeeklyDigestApprovalTests
{
    private readonly EmailTemplateRenderer _renderer = new();

    [Fact]
    public Task RenderWeeklyDigest_WithActivity()
    {
        var sections = new List<BaulDigestSection>
        {
            new("Familia Pardal", "https://el-baul.test/baules/1",
                [
                    new DigestActivityBlock(DigestBlockKind.NewChapter, "Nuevo capítulo: “Verano 1998”", "https://el-baul.test/albumes/1", 1),
                    new DigestActivityBlock(DigestBlockKind.NewRecuerdos, "3 recuerdos nuevos", "https://el-baul.test/baules/1", 3)
                ],
                OverflowSummary: null),
            new("Familia Jimena", "https://el-baul.test/baules/2",
                [new DigestActivityBlock(DigestBlockKind.NewLoosePhotos, "6 fotos nuevas sin organizar", "https://el-baul.test/sueltas/2", 6)],
                OverflowSummary: "Y 15 fotos nuevas en 3 capítulos más.")
        };
        var model = new WeeklyDigestEmailModel(
            UserName: "Pedro",
            HasBaules: true,
            HasActivity: true,
            Sections: sections,
            PrimaryCtaUrl: "https://el-baul.test/cta",
            PrimaryCtaLabel: "Añadir un recuerdo",
            NotificationSettingsUrl: "https://el-baul.test/perfil");

        return Verify(_renderer.RenderWeeklyDigest(model));
    }

    [Fact]
    public Task RenderWeeklyDigest_WithBaulesButNoActivity()
    {
        var model = new WeeklyDigestEmailModel(
            UserName: "Pedro",
            HasBaules: true,
            HasActivity: false,
            Sections: [],
            PrimaryCtaUrl: "https://el-baul.test/cta",
            PrimaryCtaLabel: "Añadir un recuerdo",
            NotificationSettingsUrl: "https://el-baul.test/perfil");

        return Verify(_renderer.RenderWeeklyDigest(model));
    }

    [Fact]
    public Task RenderWeeklyDigest_WithNoBaulesAtAll()
    {
        var model = new WeeklyDigestEmailModel(
            UserName: "Pedro",
            HasBaules: false,
            HasActivity: false,
            Sections: [],
            PrimaryCtaUrl: "https://el-baul.test/baules/nuevo",
            PrimaryCtaLabel: "Crear mi primer baúl",
            NotificationSettingsUrl: "https://el-baul.test/perfil");

        return Verify(_renderer.RenderWeeklyDigest(model));
    }

    [Fact]
    public Task RenderWeeklyDigest_WithHtmlInBaulAndBlockLabels()
    {
        var sections = new List<BaulDigestSection>
        {
            new("<script>alert(1)</script>", "https://el-baul.test/baules/1",
                [new DigestActivityBlock(DigestBlockKind.NewChapter, "<img src=x onerror=alert(1)>", "https://el-baul.test/albumes/1", 1)],
                OverflowSummary: null)
        };
        var model = new WeeklyDigestEmailModel(
            UserName: "Pedro",
            HasBaules: true,
            HasActivity: true,
            Sections: sections,
            PrimaryCtaUrl: "https://el-baul.test/cta",
            PrimaryCtaLabel: "Añadir un recuerdo",
            NotificationSettingsUrl: "https://el-baul.test/perfil");

        return Verify(_renderer.RenderWeeklyDigest(model));
    }
}
