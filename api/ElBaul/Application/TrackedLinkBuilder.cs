using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Wraps a destination URL into an absolute /email/click/{token} tracking link and remembers
/// the (token -> destination) mapping so EmailDeliveryCoordinator can persist it once the
/// owning SentEmail's real Id is known. SentEmailId/CreatedAt on each pending link are
/// placeholders (default) until then — see EmailDeliveryCoordinator.SendAsync.
/// </summary>
public class TrackedLinkBuilder(string apiPublicUrl)
{
    private readonly string _apiPublicUrl = apiPublicUrl.TrimEnd('/');

    public List<EmailLinkClick> PendingLinks { get; } = [];

    public string Track(string linkKey, string destinationUrl)
    {
        var token = Guid.NewGuid().ToString("N");
        PendingLinks.Add(new EmailLinkClick(token, default, linkKey, destinationUrl, default));
        return $"{_apiPublicUrl}/email/click/{token}";
    }
}
