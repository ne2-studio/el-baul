using Ne2Studio.Common;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api;

/// <summary>
/// The single "how does a Result become the HTTP response" rule for every controller action —
/// replaces the `result.IsSuccess ? Ok(...) : ErrorMapping.ToActionResult(result.Error)` ternary
/// that used to be hand-written at every call site. Only the failure mapping is unified (via
/// ErrorMapping); the success shape stays whatever each action's own semantics need.
/// </summary>
public static class ApiResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result) =>
        result.IsSuccess ? new OkObjectResult(result.Value) : ErrorMapping.ToActionResult(result.Error);

    // For the non-generic Result, "success" has no value to shape a response from — NoContent(),
    // Ok(new { success = true }), and similar are all legitimate depending on the endpoint, so the
    // caller supplies it. Failure mapping still goes through the one shared rule.
    public static IActionResult ToActionResult(this Result result, IActionResult onSuccess) =>
        result.IsSuccess ? onSuccess : ErrorMapping.ToActionResult(result.Error);
}
