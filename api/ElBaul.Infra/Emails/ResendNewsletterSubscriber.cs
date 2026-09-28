using System.Net.Http.Json;
using ElBaul.Core.Notifications.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra.Emails;

public class ResendNewsletterSubscriber(HttpClient httpClient, IOptions<ResendOptions> options, ILogger<ResendNewsletterSubscriber> logger)
    : INewsletterSubscriber
{
    private record ResendContactRequest(string Email, string? FirstName, [property: System.Text.Json.Serialization.JsonPropertyName("unsubscribed")] bool Unsubscribed);

    public async Task<Result> SubscribeAsync(string email, string? firstName)
    {
        var request = new ResendContactRequest(email, firstName, Unsubscribed: false);

        try
        {
            using var httpRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://api.resend.com/audiences/{options.Value.NewsletterAudienceId}/contacts")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.Value.ApiKey);

            using var response = await httpClient.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogError("Resend newsletter subscribe failed {StatusCode} {Email} {Body}", response.StatusCode, email, body);
                return Result.Failure(ApplicationError.ExternalDependencyUnavailable($"Resend returned {response.StatusCode}"));
            }

            return Result.Success();
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Resend newsletter subscribe failed {Email}", email);
            return Result.Failure(ApplicationError.ExternalDependencyUnavailable("Failed to subscribe to newsletter"));
        }
    }
}
