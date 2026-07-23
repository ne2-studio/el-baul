using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class SupportManager(
    ILogger<SupportManager> logger,
    IUserRepository userRepository,
    ISupportBackend supportBackend,
    ICurrentUserProvider currentUserProvider) : ISupportManager
{
    private static readonly string[] ValidCategories = ["Support", "Bug", "Suggestion", "BaulDeletion"];

    public async Task<Result> SubmitAsync(string category, string message, string? technicalInfo)
    {
        if (!ValidCategories.Contains(category))
            return Result.Failure($"'{category}' is not a valid support category.");

        if (string.IsNullOrWhiteSpace(message))
            return Result.Failure("Message is required.");

        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure("User not found");

        logger.LogInformation(
            "Support request received {Category} {UserId} {UserEmail} {TechnicalInfo} {Message}",
            category, userId, user.Email, technicalInfo, message);

        var submission = new SupportSubmission(category, message, technicalInfo, userId, user.Email, user.Name);
        return await supportBackend.SubmitAsync(submission);
    }
}
