using System.Net;
using ElBaul.InputPorts.Sharing;
using ElBaul.Shared;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[ApiController]
public class SharedLinksController(ISharedLinkManager sharedLinkManager) : ControllerBase
{
    [Authorize]
    [HttpPost("/api/photos/{photoId:guid}/share")]
    [ProducesResponseType(typeof(CreateSharedLinkResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateForPhoto(PhotoId photoId)
    {
        var result = await sharedLinkManager.CreateForPhotoAsync(photoId);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpPost("/api/recuerdos/{recuerdoId:guid}/share")]
    [ProducesResponseType(typeof(CreateSharedLinkResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateForRecuerdo(RecuerdoId recuerdoId)
    {
        var result = await sharedLinkManager.CreateForRecuerdoAsync(recuerdoId);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpDelete("/api/shared-links/{token}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Revoke(string token)
    {
        var result = await sharedLinkManager.RevokeAsync(token);
        return result.ToActionResult(NoContent());
    }

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/s/{token}")]
    [Produces("text/html")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Landing(string token)
    {
        var result = await sharedLinkManager.GetLandingAsync(token);
        if (result.IsFailure) return ErrorMapping.ToActionResult(result.Error);

        return Content(RenderLanding(result.Value), "text/html; charset=utf-8");
    }

    private static string RenderLanding(SharedLinkLandingDto model)
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
            ? $"""<img class="photo" src="{Attr(model.ImageUrl)}" alt="" />"""
            : "";
        var recuerdo = model.RecuerdoText is { Length: > 0 }
            ? $"""<blockquote>{Html(model.RecuerdoText)}</blockquote>"""
            : """<p class="empty">Han compartido contigo una foto familiar.</p>""";
        var byline = model.AuthorName is { Length: > 0 }
            ? $"""<p class="byline">Compartido desde un recuerdo de {Html(model.AuthorName)}</p>"""
            : "";

        return $$"""
          <!doctype html>
          <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{{title}}</title>
            <meta name="description" content="{{description}}" />
            <meta property="og:type" content="article" />
            <meta property="og:site_name" content="El Baúl" />
            <meta property="og:title" content="{{title}}" />
            <meta property="og:description" content="{{description}}" />
            {{imageMeta}}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{{title}}" />
            <meta name="twitter:description" content="{{description}}" />
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
              .photo {
                width: 100%;
                max-height: 64vh;
                object-fit: contain;
                border-radius: 24px;
                background: #ffffff;
                box-shadow: 0 14px 35px rgba(58, 50, 48, 0.14);
              }
              blockquote {
                margin: 0;
                padding: 20px;
                background: #ffffff;
                border-radius: 20px;
                font-family: Georgia, "Times New Roman", serif;
                font-size: 19px;
                line-height: 1.55;
                box-shadow: 0 8px 22px rgba(58, 50, 48, 0.08);
                white-space: pre-wrap;
              }
              .empty, .byline {
                margin: 0;
                color: #8b7e79;
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
              {{recuerdo}}
              {{byline}}
              <a class="cta" href="{{Attr(model.AppUrl)}}">Ver en El Baúl</a>
            </main>
          </body>
          </html>
          """;
    }

    private static string Html(string value) => WebUtility.HtmlEncode(value);
    private static string Attr(string value) => WebUtility.HtmlEncode(value);
}
