using ElBaul.Api.Models;
using ElBaul.Api.Scope;
using ElBaul.Core.Bauls;
using ElBaul.Core.Feed;
using Ne2Studio.Common;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules")]
public class BaulesController(
    IBaulManager baulManager, BaulScopeAggregator baulScopeAggregator, IBaulFeedManager baulFeedManager)
    : ControllerBase
{
    // Aggregates everything /baules/:id's routes need into one request — see
    // BaulScopeAggregator's doc comment. includeBaulFeed mirrors the client only wanting the
    // feed when the Recuerdos tab (its default tab on a deep link) is the one being shown.
    [HttpGet("{baulId:guid}/scope")]
    [ProducesResponseType(typeof(BaulScopeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScope(BaulId baulId, [FromQuery] bool includeBaulFeed = false)
    {
        var result = await baulScopeAggregator.GetScopeAsync(baulId, includeBaulFeed);
        return result.ToActionResult();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BaulDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await baulManager.GetAllForCurrentUserAsync();
        if (result.IsFailure) return result.ToActionResult();

        // The switcher's novedades dots are server-authoritative and per-user: each baúl is
        // "unseen" when its UpdatedAt is past the current user's BaulFeedCursor watermark, or
        // they have no watermark for it at all (never opened it on any device).
        var watermarks = await baulFeedManager.GetSeenWatermarksAsync();
        var enriched = result.Value
            .Select(baul => baul with
            {
                HasUnseenActivity =
                    !watermarks.TryGetValue(new BaulId(Guid.Parse(baul.Id)), out var seenAt)
                    || baul.UpdatedAt > seenAt,
            })
            .ToList();
        return Result.Success<IEnumerable<BaulDto>>(enriched).ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create([FromBody] CreateBaulRequest request)
    {
        var result = await baulManager.CreateAsync(request.Name, request.Description);
        // Give the creator a watermark straight away — without it, GetAll would report the
        // brand-new baúl as unseen ("no watermark" => unseen) to the very person who made it.
        if (result.IsSuccess)
            await baulFeedManager.MarkBaulSeenAsync(new BaulId(Guid.Parse(result.Value.Id)));
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(BaulId baulId)
    {
        var result = await baulManager.GetByIdAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/cover")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCover(BaulId baulId, [FromBody] SetBaulCoverRequest request)
    {
        var crop = ImageCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await baulManager.SetCoverAsync(baulId, request.PhotoId, crop.Value);
        // The actor's own edit bumps baul.UpdatedAt — advance their watermark so they aren't
        // shown their own change as a novedad on the switcher.
        if (result.IsSuccess) await baulFeedManager.MarkBaulSeenAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(BaulId baulId, [FromBody] UpdateBaulRequest request)
    {
        var result = await baulManager.UpdateAsync(baulId, request.Name, request.Description);
        // The actor's own edit bumps baul.UpdatedAt — advance their watermark so they aren't
        // shown their own change as a novedad on the switcher.
        if (result.IsSuccess) await baulFeedManager.MarkBaulSeenAsync(baulId);
        return result.ToActionResult();
    }
}
