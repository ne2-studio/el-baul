using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

/// <summary>
/// Called by the app itself (PushNotificationsHandler, on Capacitor's
/// pushNotificationActionPerformed) when the user taps a push notification — push has no pixel
/// to load, so unlike EmailOpenController this is a plain fetch, not an &lt;img&gt; request.
/// Anonymous by design, same rationale as EmailOpenController: the tap can happen with no
/// active/valid session (app cold-started from the notification, token expired in the
/// background), and there's nothing here worth gating behind auth — the signed token is already
/// the only thing that can stamp a specific SentPushNotification's FirstOpenedAt. Always
/// succeeds (204) whether or not the token decodes, so the client never needs to branch on it.
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("push/opened")]
[EnableRateLimiting("PublicLimiter")]
public class PushNotificationOpenController(
    IPushLinkSigner pushLinkSigner,
    ISentPushNotificationRepository sentPushNotificationRepository,
    IClock clock) : ControllerBase
{
    [HttpGet("{token}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Opened(string token)
    {
        var sentPushNotificationId = pushLinkSigner.TryDecodeOpenToken(token);
        if (sentPushNotificationId is not null)
        {
            await sentPushNotificationRepository.RegisterOpenAsync(sentPushNotificationId.Value, clock.UtcNow());
        }

        return NoContent();
    }
}
