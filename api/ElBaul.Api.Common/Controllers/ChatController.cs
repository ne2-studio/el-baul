using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chat")]
public class ChatController(IChatManager chatManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(Guid baulId)
    {
        var result = await chatManager.GetMessagesAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    [EnableRateLimiting("ChatLimiter")]
    [ProducesResponseType(typeof(ChatMessageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage(Guid baulId, [FromBody] SendChatMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await chatManager.SendMessageAsync(new BaulId(baulId), request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("suggestions")]
    [EnableRateLimiting("ChatLimiter")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestedQuestions(Guid baulId)
    {
        var result = await chatManager.GetSuggestedQuestionsAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
