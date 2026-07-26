using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/users")]
public class UsersController(IUserManager userManager) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe()
    {
        var result = await userManager.GetCurrentProfileAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("me/notification-preferences")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateNotificationPreferences([FromBody] UpdateNotificationPreferencesRequest request)
    {
        var result = await userManager.UpdateNotificationPreferencesAsync(request.WeeklyDigestEnabled);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
