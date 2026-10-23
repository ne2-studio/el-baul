using ElBaul.Core.Feed;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/feed")]
public class FeedController(IBaulFeedManager baulFeedManager) : ControllerBase
{
    // Additive endpoint — RecuerdosController.GetAll stays untouched, without any behavior
    // change to that existing contract.
    [HttpGet]
    [ProducesResponseType(typeof(FeedPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(BaulId baulId, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var result = await baulFeedManager.GetFeedAsync(baulId, skip, take);
        return result.ToActionResult();
    }
}
