using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface ISupportManager
{
    Task<Result> SubmitAsync(
        string category, string message, string? technicalInfo,
        Stream? screenshotContent, string? screenshotFileName, string? screenshotContentType);
}
