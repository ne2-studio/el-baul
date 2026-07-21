using System.Net.Http.Json;
using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra;

public class ResendEmailSender(HttpClient httpClient, IOptions<ResendOptions> options, ILogger<ResendEmailSender> logger)
    : IEmailSender
{
    private const string FromName = "El Baúl";

    private record ResendRequest(string From, string[] To, string Subject, string Html, string Text);
    private record ResendResponse(string Id);

    public async Task<Result<EmailSendResult>> SendAsync(EmailMessage message)
    {
        var from = $"{FromName} <{options.Value.FromAddress}>";
        var request = new ResendRequest(from, [message.To], message.Subject, message.Html, message.PlainText);

        try
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.Value.ApiKey);

            using var response = await httpClient.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogError("Resend send failed {StatusCode} {To} {Body}", response.StatusCode, message.To, body);
                return Result.Failure<EmailSendResult>($"Resend returned {response.StatusCode}");
            }

            var payload = await response.Content.ReadFromJsonAsync<ResendResponse>();
            if (payload is null || string.IsNullOrEmpty(payload.Id))
            {
                logger.LogError("Resend response missing message id {To}", message.To);
                return Result.Failure<EmailSendResult>("Resend response missing message id");
            }

            return new EmailSendResult(payload.Id);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Resend send failed {To}", message.To);
            return Result.Failure<EmailSendResult>("Failed to send email");
        }
    }
}
