using System.Net;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Tests;

public class WelcomeEmailTemplateRendererTests
{
    private readonly WelcomeEmailTemplateRenderer _renderer = new();

    [Fact]
    public void RenderWelcome_ShouldEscapeHtmlInUserControlledContent()
    {
        var model = new WelcomeEmailModel(
            UserName: "<script>alert(1)</script>",
            BaulNames: ["<img src=x onerror=alert(1)>"],
            HasBaules: true,
            PrimaryCtaUrl: "https://el-baul.test/baules/1",
            PrimaryCtaLabel: "Añadir un recuerdo");

        var result = _renderer.RenderWelcome(model);

        Assert.DoesNotContain("<script>", result.Html);
        Assert.DoesNotContain("<img src=x", result.Html);
        Assert.Contains("&lt;script&gt;", result.Html);
        Assert.Contains("&lt;img src=x", result.Html);
    }

    [Fact]
    public void RenderWelcome_ShouldTruncateVeryLongBaulNames()
    {
        var longName = new string('a', 500);
        var model = new WelcomeEmailModel("Pedro", [longName], true, "https://el-baul.test/baules/1", "Añadir un recuerdo");

        var result = _renderer.RenderWelcome(model);

        Assert.DoesNotContain(longName, result.Html);
        Assert.Contains("…", result.Html);
    }

    [Fact]
    public void RenderWelcome_ShouldSupportUnicodeAndEmoji()
    {
        var model = new WelcomeEmailModel("José 🎉", ["Verano en Salobreña 🏖️"], true, "https://el-baul.test/baules/1", "Añadir un recuerdo");

        var result = _renderer.RenderWelcome(model);

        // WebUtility.HtmlEncode escapes non-ASCII (accents, emoji) to numeric character
        // references — correct/safe for email HTML and still renders identically, but means
        // the raw HTML source won't contain the literal characters; decode before comparing.
        Assert.Contains("José 🎉", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("Verano en Salobreña 🏖️", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("José 🎉", result.PlainText);
    }

    [Fact]
    public void RenderWelcome_ShouldUseTheGivenCtaUrlAndLabel_ForUsersWithBaules()
    {
        var model = new WelcomeEmailModel("Pedro", ["Familia Pardal"], true, "https://el-baul.test/baules/abc", "Añadir un recuerdo");

        var result = _renderer.RenderWelcome(model);

        Assert.Contains("https://el-baul.test/baules/abc", result.Html);
        Assert.Contains("Añadir un recuerdo", WebUtility.HtmlDecode(result.Html));
        Assert.Contains("https://el-baul.test/baules/abc", result.PlainText);
    }

    [Fact]
    public void RenderWelcome_ShouldUseTheGivenCtaUrlAndLabel_ForUsersWithoutBaules()
    {
        var model = new WelcomeEmailModel("Pedro", [], false, "https://el-baul.test/baules/nuevo", "Crear mi primer baúl");

        var result = _renderer.RenderWelcome(model);

        Assert.Contains("https://el-baul.test/baules/nuevo", result.Html);
        Assert.Contains("Crear mi primer baúl", WebUtility.HtmlDecode(result.Html));
        Assert.DoesNotContain("<ul", result.Html);
    }

    [Fact]
    public void RenderWelcome_ShouldSummarizeBaulesBeyondTheListedLimit()
    {
        var names = Enumerable.Range(1, 8).Select(i => $"Baúl {i}").ToList();
        var model = new WelcomeEmailModel("Pedro", names, true, "https://el-baul.test/baules/1", "Añadir un recuerdo");

        var result = _renderer.RenderWelcome(model);

        Assert.Contains("Y 3 baúles más", result.Html);
    }

    [Fact]
    public void RenderWelcome_ShouldReportTemplateVersionAndLocale()
    {
        var model = new WelcomeEmailModel("Pedro", [], false, "https://el-baul.test/baules/nuevo", "Crear mi primer baúl");

        var result = _renderer.RenderWelcome(model);

        Assert.Equal("welcome-v1", result.TemplateVersion);
        Assert.Equal("es-ES", result.Locale);
        Assert.Equal("Bienvenido a El Baúl", result.Subject);
    }
}
