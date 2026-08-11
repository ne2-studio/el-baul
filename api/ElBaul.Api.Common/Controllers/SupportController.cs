using ElBaul.Api.Models;
using ElBaul.InputPorts.Support;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/support")]
public class SupportController(ISupportManager supportManager) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit([FromBody] SubmitSupportRequest request)
    {
        var technicalInfo = Request.Headers.UserAgent.ToString();

        var result = await supportManager.SubmitAsync(request.Category, request.Message, technicalInfo);

        return result.ToActionResult(Ok(new { success = true }));
    }
}
