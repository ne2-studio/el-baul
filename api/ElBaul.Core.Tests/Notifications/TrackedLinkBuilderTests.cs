using ElBaul.Core.Notifications.Application;
using ElBaul.Tests.Fakes;
namespace ElBaul.Tests;

// TrackRedirect es lo que todo *EmailManager usa para construir deep links hacia la app (ver
// WelcomeEmailManagerTests/WeeklyDigestManagerTests para la integración completa); estas
// pruebas aíslan solo la marca entry=email que el frontend lee en utils/entrySource.ts para no
// proponer la recomendación de contribución justo al entrar desde un email.
public class TrackedLinkBuilderTests
{
    private const string ApiPublicUrl = "https://api.elbaul.test";
    private const string PublicUrl = "https://elbaul.test";
    private static readonly Guid SentEmailId = Guid.NewGuid();

    private readonly FakeEmailLinkSigner _signer = new();

    private TrackedLinkBuilder CreateBuilder() => new(ApiPublicUrl, _signer, SentEmailId);

    private string DecodeDestination(string trackedUrl)
    {
        var token = trackedUrl[(trackedUrl.LastIndexOf('/') + 1)..];
        var decoded = _signer.TryDecode(token);
        Assert.NotNull(decoded);
        return decoded!.DestinationUrl;
    }

    [Fact]
    public void TrackRedirect_marca_el_destino_como_llegada_por_email()
    {
        var url = CreateBuilder().TrackRedirect("primary-cta", PublicUrl, "/baules/nuevo");

        Assert.Equal(
            $"{PublicUrl}/?redirectTo={Uri.EscapeDataString("/baules/nuevo?entry=email")}",
            DecodeDestination(url));
    }

    [Fact]
    public void TrackRedirect_usa_ampersand_cuando_el_path_ya_trae_query()
    {
        var url = CreateBuilder().TrackRedirect("cta", PublicUrl, "/baules/1?activeTab=personas");

        Assert.Equal(
            $"{PublicUrl}/?redirectTo={Uri.EscapeDataString("/baules/1?activeTab=personas&entry=email")}",
            DecodeDestination(url));
    }

    [Fact]
    public void Track_no_marca_enlaces_que_no_son_deep_links_de_la_app()
    {
        // HelpCenterUrl/PrivacyPolicyUrl (EmailFooterLinksFactory) apuntan fuera de la app y
        // usan Track directamente, no TrackRedirect — no deben llevar entry=email.
        var url = CreateBuilder().Track("help-center", "https://ayuda.externa.test/centro");

        Assert.Equal("https://ayuda.externa.test/centro", DecodeDestination(url));
    }
}
