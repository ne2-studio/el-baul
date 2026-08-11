using ElBaul.Api.Models;
using ElBaul.InputPorts.Chat;
using ElBaul.OutputPorts.Shared;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chat")]
public class ChatController(IChatManager chatManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChatMessageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(BaulId baulId)
    {
        var result = await chatManager.GetMessagesAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [EnableRateLimiting("ChatLimiter")]
    [ProducesResponseType(typeof(ChatMessageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendMessage(BaulId baulId, [FromBody] SendChatMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await chatManager.SendMessageAsync(baulId, request.Text);
        return result.ToActionResult();
    }

    [HttpGet("suggestions")]
    [EnableRateLimiting("ChatLimiter")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestedQuestions(BaulId baulId)
    {
        var result = await chatManager.GetSuggestedQuestionsAsync(baulId);
        return result.ToActionResult();
    }
}
