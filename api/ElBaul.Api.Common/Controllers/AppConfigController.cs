using Microsoft.AspNetCore.Authorization;
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
    public IActionResult Get()
    {
        var monetizationEnabled = configuration.GetValue<bool>("Features:MonetizationEnabled");
        var chatEnabled = configuration.GetValue<bool>("Features:ChatEnabled");
        var helpCenterUrl = configuration.GetValue<string>("Support:HelpCenterUrl");
        var appUrl = configuration.GetValue<string>("App:PublicUrl");

        return Ok(new
        {
            features = new
            {
                monetization = monetizationEnabled,
                chatEnabled
            },
            helpCenterUrl,
            appUrl
        });
    }
}
