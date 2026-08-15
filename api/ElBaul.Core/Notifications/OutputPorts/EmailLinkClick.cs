namespace ElBaul.Core.Notifications.OutputPorts;
public record EmailLinkClick(
    string Token,
    Guid SentEmailId,
    string LinkKey,
    string DestinationUrl,
    DateTime CreatedAt,
    DateTime? FirstClickedAt = null,
    DateTime? LastClickedAt = null,
    int ClickCount = 0);
