using ElBaul.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Tests;

public class ApiResultExtensionsTests
{
    [Fact]
    public void GenericResult_ToActionResult_OnSuccess_ShouldReturnOkWithTheValue()
    {
        var actionResult = Assert.IsType<OkObjectResult>(Result.Success("hello").ToActionResult());

        Assert.Equal("hello", actionResult.Value);
        Assert.Equal(StatusCodes.Status200OK, actionResult.StatusCode);
    }

    [Fact]
    public void GenericResult_ToActionResult_OnFailure_ShouldDelegateToErrorMapping()
    {
        var error = ApplicationError.NotFound("missing");

        var actionResult = Assert.IsType<NotFoundObjectResult>(Result.Failure<string>(error).ToActionResult());

        Assert.Equal(StatusCodes.Status404NotFound, actionResult.StatusCode);
    }

    [Fact]
    public void NonGenericResult_ToActionResult_OnSuccess_ShouldReturnTheSuppliedResult()
    {
        var onSuccess = new NoContentResult();

        var actionResult = Result.Success().ToActionResult(onSuccess);

        Assert.Same(onSuccess, actionResult);
    }

    [Fact]
    public void NonGenericResult_ToActionResult_OnFailure_ShouldDelegateToErrorMapping_NotReturnTheSuppliedResult()
    {
        var error = ApplicationError.Forbidden("no access");

        var actionResult = Assert.IsType<ObjectResult>(Result.Failure(error).ToActionResult(new NoContentResult()));

        Assert.Equal(StatusCodes.Status403Forbidden, actionResult.StatusCode);
    }
}
