using ElBaul.Api.Models;
using ElBaul.Core.Chat.InputPorts;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chat")]
public class ChatController(IChatManager chatManager, IChatMemoryManager chatMemoryManager) : ControllerBase
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

    [HttpGet("memories")]
    [ProducesResponseType(typeof(IEnumerable<ChatMemoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMemories(BaulId baulId)
    {
        var result = await chatMemoryManager.GetMemoriesAsync(baulId);
        return result.ToActionResult();
    }

    // Not nested under {baulId}/chat — a memory id alone already identifies which baúl it
    // belongs to, same reasoning as PUT /api/recuerdos/{recuerdoId}.
    [HttpPut("/api/chat-memories/{chatMemoryId:guid}")]
    [ProducesResponseType(typeof(ChatMemoryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMemory(ChatMemoryId chatMemoryId, [FromBody] UpdateChatMemoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Content is required" });

        var result = await chatMemoryManager.UpdateMemoryAsync(chatMemoryId, request.Content);
        return result.ToActionResult();
    }

    [HttpDelete("/api/chat-memories/{chatMemoryId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteMemory(ChatMemoryId chatMemoryId)
    {
        var result = await chatMemoryManager.DeleteMemoryAsync(chatMemoryId);
        return result.ToActionResult(Ok(new { success = true }));
    }
}
