using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra;

// Adapter for LeadHub, our contact-forms platform. LeadHub takes a plain
// multipart/form-data POST — any fields we send are accepted, there's no fixed
// schema — and responds with a redirect to a "thanks" page on success. We don't
// follow that redirect (no need to land on the page itself, and LeadHub doesn't
// always send a Location header we could follow anyway) — a 3xx response is the
// success signal on its own, same as a 2xx.
public class LeadHubSupportBackend(HttpClient httpClient, IConfiguration configuration, ILogger<LeadHubSupportBackend> logger)
    : ISupportBackend
{
    public async Task<Result> SubmitAsync(SupportSubmission submission)
    {
        var submitUrl = configuration["Support:LeadHub:SubmitUrl"];
        if (string.IsNullOrEmpty(submitUrl))
        {
            logger.LogWarning("Support:LeadHub:SubmitUrl is not configured; cannot submit support request");
            return Result.Failure("Support backend is not configured.");
        }

        using var content = new MultipartFormDataContent
        {
            { new StringContent(submission.Category), "category" },
            { new StringContent(submission.Message), "message" },
            { new StringContent(submission.TechnicalInfo ?? ""), "technicalInfo" },
            { new StringContent(submission.UserId), "userId" },
            { new StringContent(submission.UserEmail), "userEmail" },
            { new StringContent(submission.UserName ?? ""), "userName" },
        };

        try
        {
            using var response = await httpClient.PostAsync(submitUrl, content);
            var isRedirect = (int)response.StatusCode is >= 300 and < 400;
            if (!response.IsSuccessStatusCode && !isRedirect)
            {
                logger.LogError(
                    "LeadHub support submission failed {StatusCode} {Category} {UserId}",
                    response.StatusCode, submission.Category, submission.UserId);
                return Result.Failure("Failed to submit support request.");
            }

            return Result.Success();
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "LeadHub support submission failed {Category} {UserId}", submission.Category, submission.UserId);
            return Result.Failure("Failed to submit support request.");
        }
    }
}
