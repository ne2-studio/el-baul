using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/support")]
public class SupportController(ISupportManager supportManager) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitSupportRequest request)
    {
        var technicalInfo = Request.Headers.UserAgent.ToString();

        var result = await supportManager.SubmitAsync(request.Category, request.Message, technicalInfo);

        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }
}
