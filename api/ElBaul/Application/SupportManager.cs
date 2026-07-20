using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

// There's no ticket backend yet (FreeScout integration is a later milestone) — a
// submission's only durable trace is this structured log line, which the team reads
// straight out of Seq until a real inbox exists.
public class SupportManager(
    ILogger<SupportManager> logger,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    ICurrentUserProvider currentUserProvider) : ISupportManager
{
    private static readonly string[] ValidCategories = ["Support", "Bug", "Suggestion"];

    public async Task<Result> SubmitAsync(
        string category, string message, string? technicalInfo,
        Stream? screenshotContent, string? screenshotFileName, string? screenshotContentType)
    {
        if (!ValidCategories.Contains(category))
            return Result.Failure($"'{category}' is not a valid support category.");

        if (string.IsNullOrWhiteSpace(message))
            return Result.Failure("Message is required.");

        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure("User not found");

        string? screenshotKey = null;
        if (screenshotContent is not null && screenshotFileName is not null)
        {
            screenshotKey = $"support/{userId}/{idGenerator.NewId()}-{screenshotFileName}";
            await photoStorage.SaveAsync(screenshotKey, screenshotContent, screenshotContentType ?? "application/octet-stream");
        }

        logger.LogInformation(
            "Support request received {Category} {UserId} {UserEmail} {ScreenshotKey} {TechnicalInfo} {Message}",
            category, userId, user.Email, screenshotKey, technicalInfo, message);

        return Result.Success();
    }
}
