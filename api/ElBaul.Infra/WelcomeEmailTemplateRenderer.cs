using System.Net;
using System.Text;
using ElBaul.Ports.Output;

namespace ElBaul.Infra;

public class WelcomeEmailTemplateRenderer : IEmailTemplateRenderer
{
    public const string TemplateVersion = "welcome-v1";
    public const string Locale = "es-ES";

    private const int MaxBaulNameLength = 80;
    private const int MaxListedBaules = 5;

    public RenderedEmail RenderWelcome(WelcomeEmailModel model)
    {
        var subject = "Bienvenido a El Baúl";
        var userName = Truncate(model.UserName, 100);

        var intro = model.HasBaules
            ? $"Ya formas parte de la historia de {(model.BaulNames.Count == 1 ? "tu familia" : "tus familias")} en El Baúl."
            : "Aún no perteneces a ningún baúl, pero eso tiene fácil arreglo.";

        var body = model.HasBaules
            ? "Cada foto y cada recuerdo que añadáis se queda a salvo y disponible para siempre. El siguiente paso es sencillo: añade un recuerdo."
            : "Un baúl es el espacio donde tu familia guarda sus fotos y recuerdos. Crea el tuyo para empezar.";

        var html = new StringBuilder();
        html.Append($$"""
            <!doctype html>
            <html lang="es">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>{{HtmlEncode(subject)}}</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#3a2f28;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:32px 32px 16px 32px;">
                          <h1 style="margin:0 0 16px 0;font-size:22px;color:#6b3f2a;">El Baúl</h1>
                          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">Hola {{HtmlEncode(userName)}},</p>
                          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">{{HtmlEncode(intro)}}</p>
                          <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">{{HtmlEncode(body)}}</p>
            """);

        if (model.HasBaules && model.BaulNames.Count > 0)
        {
            html.Append("""
                          <ul style="margin:0 0 24px 0;padding-left:20px;font-size:15px;line-height:1.6;">
                """);
            foreach (var name in model.BaulNames.Take(MaxListedBaules))
            {
                html.Append($"                <li>{HtmlEncode(Truncate(name, MaxBaulNameLength))}</li>\n");
            }
            var remaining = model.BaulNames.Count - MaxListedBaules;
            if (remaining > 0)
            {
                html.Append($"                <li>Y {remaining} baúl{(remaining == 1 ? "" : "es")} más</li>\n");
            }
            html.Append("                          </ul>\n");
        }

        html.Append($$"""
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="border-radius:8px;background-color:#6b3f2a;">
                                <a href="{{HtmlEncode(model.PrimaryCtaUrl)}}" style="display:inline-block;padding:12px 24px;font-size:15px;color:#ffffff;text-decoration:none;">{{HtmlEncode(model.PrimaryCtaLabel)}}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """);

        var plainTextBuilder = new StringBuilder();
        plainTextBuilder.AppendLine($"Hola {userName},");
        plainTextBuilder.AppendLine();
        plainTextBuilder.AppendLine(intro);
        plainTextBuilder.AppendLine(body);
        if (model.HasBaules && model.BaulNames.Count > 0)
        {
            plainTextBuilder.AppendLine();
            foreach (var name in model.BaulNames.Take(MaxListedBaules))
            {
                plainTextBuilder.AppendLine($"- {Truncate(name, MaxBaulNameLength)}");
            }
            var remaining = model.BaulNames.Count - MaxListedBaules;
            if (remaining > 0)
            {
                plainTextBuilder.AppendLine($"Y {remaining} baúl{(remaining == 1 ? "" : "es")} más");
            }
        }
        plainTextBuilder.AppendLine();
        plainTextBuilder.AppendLine($"{model.PrimaryCtaLabel}: {model.PrimaryCtaUrl}");

        return new RenderedEmail(subject, html.ToString(), plainTextBuilder.ToString(), TemplateVersion, Locale);
    }

    private static string HtmlEncode(string value) => WebUtility.HtmlEncode(value);

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..(maxLength - 1)] + "…";
}
