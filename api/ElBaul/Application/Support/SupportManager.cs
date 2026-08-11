using ElBaul.Application.Support;
using ElBaul.InputPorts.Support;
using ElBaul.OutputPorts.Support;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

using Microsoft.Extensions.Logging;

namespace ElBaul.Application.Support;
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
            return Result.Failure(ApplicationError.Validation($"'{category}' is not a valid support category."));

        if (string.IsNullOrWhiteSpace(message))
            return Result.Failure(ApplicationError.Validation("Message is required."));

        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure(ApplicationError.NotFound("User not found"));

        logger.LogInformation(
            "Support request received {Category} {UserEmail} {TechnicalInfo} {Message}",
            category, user.Email, technicalInfo, message);

        var submission = new SupportSubmission(category, message, technicalInfo, userId, user.Email, user.Name);
        return await supportBackend.SubmitAsync(submission);
    }
}
