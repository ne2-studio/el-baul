using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin")]
public class AdminController(
    IAdminManager adminManager,
    IWelcomeEmailManager welcomeEmailManager,
    IWeeklyDigestManager weeklyDigestManager,
    IConfiguration configuration) : ControllerBase
{
    [HttpGet("dashboard")]
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
    public async Task<IActionResult> GetUsers()
    {
        var result = await adminManager.GetAllUsersAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUser(string userId)
    {
        var result = await adminManager.GetUserDetailAsync(userId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules")]
    public async Task<IActionResult> GetBaules()
    {
        var result = await adminManager.GetAllBaulesAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}")]
    public async Task<IActionResult> GetBaul(Guid baulId)
    {
        var result = await adminManager.GetBaulDetailAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("emails")]
    public async Task<IActionResult> GetEmails()
    {
        var result = await adminManager.GetSentEmailsAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("users/{userId}/emails")]
    public async Task<IActionResult> GetUserEmails(string userId)
    {
        var result = await adminManager.GetUserSentEmailsAsync(userId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("emails/welcome-test/{userId}")]
    public async Task<IActionResult> SendWelcomeTestEmail(string userId)
    {
        var result = await welcomeEmailManager.SendTestWelcomeEmailAsync(userId);
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("emails/digest-test/{userId}")]
    public async Task<IActionResult> SendDigestTestEmail(string userId)
    {
        var result = await weeklyDigestManager.SendTestWeeklyDigestAsync(userId);
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
