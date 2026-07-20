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
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Submit([FromForm] SubmitSupportRequest request)
    {
        await using var stream = request.Screenshot?.OpenReadStream();
        var technicalInfo = Request.Headers.UserAgent.ToString();

        var result = await supportManager.SubmitAsync(
            request.Category, request.Message, technicalInfo,
            stream, request.Screenshot?.FileName, request.Screenshot?.ContentType);

        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }
}
