using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chat")]
public class ChatController(IChatManager chatManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMessages(Guid baulId)
    {
        var result = await chatManager.GetMessagesAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    [EnableRateLimiting("ChatLimiter")]
    public async Task<IActionResult> SendMessage(Guid baulId, [FromBody] SendChatMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await chatManager.SendMessageAsync(baulId, request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
