using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
        var helpCenterUrl = configuration.GetValue<string>("Support:HelpCenterUrl");

        return Ok(new
        {
            features = new
            {
                monetization = monetizationEnabled
            },
            helpCenterUrl
        });
    }
}
