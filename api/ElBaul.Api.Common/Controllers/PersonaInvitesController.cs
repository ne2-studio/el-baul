using ElBaul.Core.Personas;
using ElBaul.Core.Sharing;
using System.Net;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

// Public/authenticated endpoints for accepting a persona-scoped invite link — see
// PersonasController.Invite for the admin-only action that issues/re-shares the token in the
// first place.
[ApiController]
public class PersonaInvitesController(IPersonaInviteManager personaInviteManager) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/invitacion/baul/{token}")]
    [Produces("text/html")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Landing(string token)
    {
        var result = await personaInviteManager.GetLandingAsync(token);
        if (result.IsFailure) return ErrorMapping.ToActionResult(result.Error);

        return Content(RenderLanding(result.Value), "text/html; charset=utf-8");
    }

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/persona-invites/{token}/preview")]
    [ProducesResponseType(typeof(PersonaInvitePreviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPreview(string token)
    {
        var result = await personaInviteManager.GetPreviewAsync(token);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpPost("/api/persona-invites/{token}/accept")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Accept(string token)
    {
        var result = await personaInviteManager.AcceptAsync(token);
        return result.ToActionResult();
    }

    private static string RenderLanding(PersonaInviteLandingDto model)
    {
        var title = Html(model.Title);
        var description = Html(model.Description);
        var imageMeta = model.ImageUrl is { Length: > 0 } imageUrl
            ? $"""
              <meta property="og:image" content="{Attr(imageUrl)}" />
              <meta property="og:image:secure_url" content="{Attr(imageUrl)}" />
              <meta name="twitter:image" content="{Attr(imageUrl)}" />
              """
            : "";
        var image = model.ImageUrl is { Length: > 0 }
            ? $"""<img class="cover" src="{Attr(model.ImageUrl)}" alt="" />"""
            : "";

        return $$"""
          <!doctype html>
          <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{{title}}</title>
            <meta name="description" content="{{description}}" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="El Baúl" />
            <meta property="og:title" content="{{title}}" />
            <meta property="og:description" content="{{description}}" />
            {{imageMeta}}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{{title}}" />
            <meta name="twitter:description" content="{{description}}" />
            <script>
              window.location.replace("{{Attr(model.AppUrl)}}");
            </script>
            <style>
              :root { color-scheme: light; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                background: #f5f1ed;
                color: #3a3230;
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              main {
                width: min(100%, 560px);
                margin: 0 auto;
                min-height: 100vh;
                padding: 24px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 20px;
              }
              .brand {
                margin: 0;
                font-family: Georgia, "Times New Roman", serif;
                font-size: 22px;
                font-weight: 600;
                color: #6b3f2a;
              }
              .cover {
                width: 100%;
                max-height: 64vh;
                object-fit: cover;
                border-radius: 24px;
                background: #ffffff;
                box-shadow: 0 14px 35px rgba(58, 50, 48, 0.14);
              }
              h1 {
                margin: 0;
                font-family: Georgia, "Times New Roman", serif;
                font-size: 32px;
                line-height: 1.15;
              }
              p {
                margin: 0;
                color: #6f625d;
                line-height: 1.5;
              }
              .cta {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 48px;
                padding: 12px 20px;
                border-radius: 20px;
                background: #c67b5c;
                color: #ffffff;
                text-decoration: none;
                font-weight: 600;
                box-shadow: 0 8px 20px rgba(198, 123, 92, 0.24);
              }
            </style>
          </head>
          <body>
            <main>
              <p class="brand">El Baúl</p>
              {{image}}
              <h1>{{Html(model.BaulName)}}</h1>
              <p>{{description}}</p>
              <a class="cta" href="{{Attr(model.AppUrl)}}">Abrir invitación</a>
            </main>
          </body>
          </html>
          """;
    }

    private static string Html(string value) => WebUtility.HtmlEncode(value);
    private static string Attr(string value) => WebUtility.HtmlEncode(value);
}
