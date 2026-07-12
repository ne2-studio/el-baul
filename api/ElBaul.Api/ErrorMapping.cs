using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api;

/// <summary>
/// Maps a Result.Error string from the Application layer to an HTTP response, mirroring
/// the old backend's per-message error.message checks in each route handler.
/// </summary>
public static class ErrorMapping
{
    public static IActionResult ToActionResult(string error)
    {
        if (error.Contains("access denied", StringComparison.OrdinalIgnoreCase))
            return new ObjectResult(new { error }) { StatusCode = StatusCodes.Status403Forbidden };

        if (error.Contains("not found", StringComparison.OrdinalIgnoreCase))
            return new NotFoundObjectResult(new { error });

        return new BadRequestObjectResult(new { error });
    }
}
