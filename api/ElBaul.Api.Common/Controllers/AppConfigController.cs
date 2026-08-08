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
        var monetizationEnabled = configuration.GetValue<bool>("Features:MonetizationEnabled");
        var chatEnabled = configuration.GetValue<bool>("Features:ChatEnabled");
        var chatSuggestionsEnabled = configuration.GetValue<bool>("Features:ChatSuggestionsEnabled");
        var sharedLinksEnabled = configuration.GetValue<bool>("Features:SharedLinksEnabled");
        var baulFeedEnabled = configuration.GetValue<bool>("Features:BaulFeedEnabled");
        var helpCenterUrl = configuration.GetValue<string>("Support:HelpCenterUrl");
        var appUrl = configuration.GetValue<string>("App:PublicUrl");

        return Ok(new
        {
            features = new
            {
                monetization = monetizationEnabled,
                chatEnabled,
                chatSuggestionsEnabled,
                sharedLinksEnabled,
                baulFeedEnabled
            },
            helpCenterUrl,
            appUrl
        });
    }
}
