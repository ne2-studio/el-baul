using ElBaul.Api.Models;
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
public class AppConfigController(IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(AppConfigResponse), StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var chatEnabled = configuration.GetValue<bool>("Features:ChatEnabled");
        var chatSuggestionsEnabled = configuration.GetValue<bool>("Features:ChatSuggestionsEnabled");
        var sharedLinksEnabled = configuration.GetValue<bool>("Features:SharedLinksEnabled");
        var baulFeedEnabled = configuration.GetValue<bool>("Features:BaulFeedEnabled");
        var androidAppBannerEnabled = configuration.GetValue<bool>("Features:AndroidAppBannerEnabled");
        var chatMemoryEnabled = configuration.GetValue<bool>("Features:ChatMemoryEnabled");
        var tvModeEnabled = configuration.GetValue<bool>("Features:TvModeEnabled");
        // Exposed even while maintenance mode is on: this endpoint is the one exception
        // MaintenanceModeMiddleware carves out, so the frontend can learn the flag is set (and
        // learn it's back off) without a deploy.
        var maintenanceModeEnabled = configuration.GetValue<bool>("Features:MaintenanceModeEnabled");
        var helpCenterUrl = configuration.GetValue<string>("Support:HelpCenterUrl");
        var appUrl = configuration.GetValue<string>("App:PublicUrl");
        var googlePlayUrl = configuration.GetValue<string>("App:GooglePlayUrl");
        // Defaults match the values this feature shipped with (60 min cooldown, 20% chance of
        // "write a memory" over "tag people") — configurable here purely so testing can shrink
        // the cooldown/skew the ratio without a deploy, see AppConfigResponse.
        var contributionSuggestionCooldownMinutes = configuration.GetValue("Features:ContributionSuggestionCooldownMinutes", 60);
        var writeMemorySuggestionRatio = configuration.GetValue("Features:WriteMemorySuggestionRatio", 0.2);

        return Ok(new
        {
            features = new
            {
                chatEnabled,
                chatSuggestionsEnabled,
                sharedLinksEnabled,
                baulFeedEnabled,
                androidAppBannerEnabled,
                chatMemoryEnabled,
                tvModeEnabled,
                maintenanceModeEnabled
            },
            helpCenterUrl,
            appUrl,
            googlePlayUrl,
            contributionSuggestionCooldownMinutes,
            writeMemorySuggestionRatio
        });
    }
}
