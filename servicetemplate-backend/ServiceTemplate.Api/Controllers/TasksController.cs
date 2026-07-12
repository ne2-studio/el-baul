using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServiceTemplate.Api.Models;
using ServiceTemplate.Ports.Input;

namespace ServiceTemplate.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/tasks")]
public class TasksController(ITaskManager taskManager) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        var result = await taskManager.CreateAsync(request.Title);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        if (skip < 0)
            return BadRequest(new { error = "Skip parameter cannot be negative." });

        if (take <= 0 || take > 100)
            return BadRequest(new { error = "Take parameter must be between 1 and 100." });

        var result = await taskManager.ListAsync(skip, take);

        if (!result.IsSuccess)
            return StatusCode(500, new { error = result.Error });

        return Ok(result.Value);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var parsedId))
            return BadRequest(new { error = $"'{id}' is not a valid task id." });

        var result = await taskManager.DeleteAsync(parsedId);

        if (!result.IsSuccess)
            return NotFound(new { error = result.Error });

        return NoContent();
    }
}
