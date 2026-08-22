using ElBaul.Api.Models;
using ElBaul.Core.Analytics;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/analytics")]
public class AnalyticsController(IUserSessionManager userSessionManager) : ControllerBase
{
    // Called once per session by the client (see app/src/utils/platform.ts and entrySource.ts)
    // when it opens the app, not on every request — feeds analytics.user_sessions, which
    // Metabase queries directly for DAU/platform/entry-source breakdowns (no admin endpoint).
    [HttpPost("session-open")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SessionOpen([FromBody] RecordSessionOpenRequest request)
    {
        var result = await userSessionManager.RecordSessionOpenAsync(request.Platform, request.EntrySource);

        return result.ToActionResult(Ok(new { success = true }));
    }
}
