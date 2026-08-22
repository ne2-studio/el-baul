using ElBaul.Api.Models;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/app-config")]
[EnableRateLimiting("PublicLimiter")]
public class AppConfigController(IAppConfiguration appConfiguration, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(AppConfigResponse), StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var googlePlayUrl = configuration.GetValue<string>("App:GooglePlayUrl");
        // Default matches the value this feature shipped with (60 min cooldown) — configurable
        // purely so testing can shrink it without a deploy. Not on IAppConfiguration: it's a
        // tuning knob, not a kill switch, so it stays a plain config value rather than a flag.
        var contributionSuggestionCooldownMinutes = configuration.GetValue("Features:ContributionSuggestionCooldownMinutes", 60);

        return Ok(new
        {
            features = new
            {
                chatEnabled = appConfiguration.ChatEnabled,
                chatSuggestionsEnabled = appConfiguration.ChatSuggestionsEnabled,
                sharedLinksEnabled = appConfiguration.SharedLinksEnabled,
                baulFeedEnabled = appConfiguration.BaulFeedEnabled,
                androidAppBannerEnabled = appConfiguration.AndroidAppBannerEnabled,
                chatMemoryEnabled = appConfiguration.ChatMemoryEnabled,
                tvModeEnabled = appConfiguration.TvModeEnabled,
                // Exposed even while maintenance mode is on: this endpoint is the one exception
                // MaintenanceModeMiddleware carves out, so the frontend can learn the flag is set
                // (and learn it's back off) without a deploy.
                maintenanceModeEnabled = appConfiguration.MaintenanceModeEnabled
            },
            helpCenterUrl = appConfiguration.HelpCenterUrl,
            appUrl = appConfiguration.PublicUrl,
            googlePlayUrl,
            contributionSuggestionCooldownMinutes,
            writeMemorySuggestionRatio = appConfiguration.WriteMemorySuggestionRatio
        });
    }
}
