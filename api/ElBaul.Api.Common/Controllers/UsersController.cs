using ElBaul.Api.Models;
using ElBaul.Core.Notifications.InputPorts;
using ElBaul.Core.Users.InputPorts;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/users")]
public class UsersController(IUserManager userManager, IPushNotificationManager pushNotificationManager) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe()
    {
        var result = await userManager.GetCurrentProfileAsync();
        return result.ToActionResult();
    }

    [HttpPut("me/notification-preferences")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateNotificationPreferences([FromBody] UpdateNotificationPreferencesRequest request)
    {
        var result = await userManager.UpdateNotificationPreferencesAsync(request.WeeklyDigestEnabled);
        return result.ToActionResult();
    }

    [HttpPost("me/onboarding-seen")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkOnboardingSeen()
    {
        var result = await userManager.MarkOnboardingSeenAsync();
        return result.ToActionResult();
    }

    [HttpPost("me/push-tokens")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenRequest request)
    {
        var result = await pushNotificationManager.RegisterTokenAsync(request.Token, request.Platform);
        return result.ToActionResult(NoContent());
    }

    [HttpPost("me/push-tokens/unregister")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UnregisterPushToken([FromBody] UnregisterPushTokenRequest request)
    {
        var result = await pushNotificationManager.UnregisterTokenAsync(request.Token);
        return result.ToActionResult(NoContent());
    }
}
