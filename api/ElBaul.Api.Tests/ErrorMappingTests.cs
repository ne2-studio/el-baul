using ElBaul.Ports.Input;
using ElBaul.Ports.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Tests;

public class ErrorMappingTests
{
    [Theory]
    [InlineData(ApplicationErrorCode.Validation, "Invite missing", StatusCodes.Status400BadRequest)]
    [InlineData(ApplicationErrorCode.Forbidden, "No puedes entrar", StatusCodes.Status403Forbidden)]
    [InlineData(ApplicationErrorCode.NotFound, "Invite missing", StatusCodes.Status404NotFound)]
    [InlineData(ApplicationErrorCode.ExternalDependencyUnavailable, "Provider timeout", StatusCodes.Status503ServiceUnavailable)]
    public void ToActionResult_ShouldMapStatusByErrorCode_NotMessage(ApplicationErrorCode code, string message, int expectedStatusCode)
    {
        var result = Assert.IsAssignableFrom<ObjectResult>(
            ErrorMapping.ToActionResult(new ApplicationError(code, message)));

        Assert.Equal(expectedStatusCode, result.StatusCode);
        Assert.Equal(message, ReadErrorMessage(result.Value));
    }

    private static string? ReadErrorMessage(object? value) =>
        value?.GetType().GetProperty("error")?.GetValue(value) as string;
}
