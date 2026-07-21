using System.Net;
using System.Text;
using ElBaul.Ports.Output;

namespace ElBaul.Infra;

public class EmailTemplateRenderer : IEmailTemplateRenderer
{
    public const string WelcomeTemplateVersion = "welcome-v1";
    public const string DigestTemplateVersion = "weekly-digest-v1";
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

        return new RenderedEmail(subject, html.ToString(), plainTextBuilder.ToString(), WelcomeTemplateVersion, Locale);
    }

    public RenderedEmail RenderWeeklyDigest(WeeklyDigestEmailModel model)
    {
        var subject = "Resumen semanal de tus baúles";
        var userName = Truncate(model.UserName, 100);

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
            """);

        var plainTextBuilder = new StringBuilder();
        plainTextBuilder.AppendLine($"Hola {userName},");
        plainTextBuilder.AppendLine();

        if (model.HasActivity)
        {
            html.Append("""
                          <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;">Esto es lo que ha pasado esta semana en tus baúles:</p>
                """);
            plainTextBuilder.AppendLine("Esto es lo que ha pasado esta semana en tus baúles:");

            foreach (var section in model.Sections)
            {
                html.Append($"""

                              <h2 style="margin:20px 0 8px 0;font-size:17px;color:#6b3f2a;">{HtmlEncode(Truncate(section.BaulName, MaxBaulNameLength))}</h2>
                              <ul style="margin:0 0 8px 0;padding-left:20px;font-size:15px;line-height:1.6;">

                """);
                plainTextBuilder.AppendLine();
                plainTextBuilder.AppendLine(Truncate(section.BaulName, MaxBaulNameLength));

                foreach (var block in section.Blocks)
                {
                    html.Append($"                <li><a href=\"{HtmlEncode(block.DeepLinkUrl)}\" style=\"color:#6b3f2a;\">{HtmlEncode(block.Label)}</a></li>\n");
                    plainTextBuilder.AppendLine($"- {block.Label}: {block.DeepLinkUrl}");
                }

                if (section.OverflowSummary is { } overflow)
                {
                    html.Append($"                <li>{HtmlEncode(overflow)}</li>\n");
                    plainTextBuilder.AppendLine($"- {overflow}");
                }

                html.Append("                          </ul>\n");
            }
        }
        else if (model.HasBaules)
        {
            const string tranquilMessage =
                "Esta semana tus baúles han estado tranquilos. Quizá sea un buen momento para rescatar una foto o escribir ese recuerdo que siempre se cuenta en casa.";
            html.Append($"                          <p style=\"margin:0 0 20px 0;font-size:16px;line-height:1.5;\">{HtmlEncode(tranquilMessage)}</p>\n");
            plainTextBuilder.AppendLine(tranquilMessage);
        }
        else
        {
            const string noBaulesMessage =
                "Todavía no tienes ningún baúl. Crea el tuyo para empezar a guardar fotos y recuerdos con tu familia.";
            html.Append($"                          <p style=\"margin:0 0 20px 0;font-size:16px;line-height:1.5;\">{HtmlEncode(noBaulesMessage)}</p>\n");
            plainTextBuilder.AppendLine(noBaulesMessage);
        }

        html.Append($$"""

                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                            <tr>
                              <td style="border-radius:8px;background-color:#6b3f2a;">
                                <a href="{{HtmlEncode(model.PrimaryCtaUrl)}}" style="display:inline-block;padding:12px 24px;font-size:15px;color:#ffffff;text-decoration:none;">{{HtmlEncode(model.PrimaryCtaLabel)}}</a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:28px 0 0 0;font-size:12px;line-height:1.5;color:#8a7a6d;">
                            Recibes este resumen porque formas parte de El Baúl. Puedes cambiar tus preferencias de
                            email desde la <a href="{{HtmlEncode(model.NotificationSettingsUrl)}}" style="color:#8a7a6d;">configuración de notificaciones</a>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """);

        plainTextBuilder.AppendLine();
        plainTextBuilder.AppendLine($"{model.PrimaryCtaLabel}: {model.PrimaryCtaUrl}");
        plainTextBuilder.AppendLine();
        plainTextBuilder.AppendLine("Recibes este resumen porque formas parte de El Baúl. Puedes cambiar tus preferencias de");
        plainTextBuilder.AppendLine($"email desde la configuración de notificaciones: {model.NotificationSettingsUrl}");

        return new RenderedEmail(subject, html.ToString(), plainTextBuilder.ToString(), DigestTemplateVersion, Locale);
    }

    private static string HtmlEncode(string value) => WebUtility.HtmlEncode(value);

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..(maxLength - 1)] + "…";
}
