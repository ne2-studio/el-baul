using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin")]
public class AdminController(
    IAdminManager adminManager,
    IWelcomeEmailManager welcomeEmailManager,
    IWeeklyDigestManager weeklyDigestManager,
    IPushNotificationManager pushNotificationManager,
    IConfiguration configuration) : ControllerBase
{
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AdminDashboardResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await adminManager.GetDashboardCountsAsync();
        if (!result.IsSuccess) return ErrorMapping.ToActionResult(result.Error);

        var counts = result.Value;
        return Ok(new
        {
            counts.RegisteredUsers,
            counts.TotalBaules,
            counts.TotalPhotos,
            counts.PhotosUploadedToday,
            externalLinks = GetExternalLinks()
        });
    }

    [HttpGet("users")]
    [ProducesResponseType(typeof(IEnumerable<AdminUserListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers()
    {
        var result = await adminManager.GetAllUsersAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("users/{userId}")]
    [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUser(string userId)
    {
        var result = await adminManager.GetUserDetailAsync(new UserId(userId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules")]
    [ProducesResponseType(typeof(IEnumerable<AdminBaulListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBaules()
    {
        var result = await adminManager.GetAllBaulesAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}")]
    [ProducesResponseType(typeof(AdminBaulDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBaul(Guid baulId)
    {
        var result = await adminManager.GetBaulDetailAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("baules/{baulId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteBaul(Guid baulId)
    {
        var result = await adminManager.DeleteBaulAsync(new BaulId(baulId));
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("emails")]
    [ProducesResponseType(typeof(IEnumerable<AdminSentEmailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmails()
    {
        var result = await adminManager.GetSentEmailsAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("users/{userId}/emails")]
    [ProducesResponseType(typeof(IEnumerable<AdminSentEmailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserEmails(string userId)
    {
        var result = await adminManager.GetUserSentEmailsAsync(new UserId(userId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("users/{userId}/baules/{baulId:guid}/chat-context-debug")]
    [ProducesResponseType(typeof(AdminChatContextDebugDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DebugChatContext(string userId, Guid baulId, [FromBody] DebugChatContextRequest request)
    {
        var result = await adminManager.DebugChatContextAsync(new UserId(userId), new BaulId(baulId), request.Message);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("emails/welcome-test/{userId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SendWelcomeTestEmail(string userId)
    {
        var result = await welcomeEmailManager.SendTestWelcomeEmailAsync(new UserId(userId));
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("emails/digest-test/{userId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SendDigestTestEmail(string userId)
    {
        var result = await weeklyDigestManager.SendTestWeeklyDigestAsync(new UserId(userId));
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("users/{userId}/push-notifications/test")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SendTestPushNotification(string userId, [FromBody] SendTestPushNotificationRequest request)
    {
        var result = await pushNotificationManager.SendTestNotificationAsync(new UserId(userId), request.Message, request.DeepLink);
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    private IEnumerable<object> GetExternalLinks()
    {
        var tools = new (string Label, string? Key)[]
        {
            ("Metabase", "ExternalTools:Metabase"),
            ("Sentry", "ExternalTools:Sentry"),
            ("Hangfire", "ExternalTools:Hangfire"),
            ("Seq", "ExternalTools:Seq"),
            ("Beszel", "ExternalTools:Beszel"),
            ("MinIO Console", "ExternalTools:MinioConsole"),
            ("Mailpit", "ExternalTools:Mailpit")
        };

        foreach (var (label, key) in tools)
        {
            var url = configuration.GetValue<string>(key!);
            if (!string.IsNullOrEmpty(url))
            {
                yield return new { label, url };
            }
        }
    }
}
