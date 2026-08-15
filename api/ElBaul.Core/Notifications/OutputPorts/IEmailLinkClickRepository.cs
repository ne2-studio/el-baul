namespace ElBaul.Core.Notifications.OutputPorts;
public interface IEmailLinkClickRepository
{
    /// <summary>Legacy path only — resolves tokens minted before self-contained signed tokens.</summary>
    Task<EmailLinkClick?> GetByTokenAsync(string token);

    /// <summary>
    /// Legacy path only: increments ClickCount, sets LastClickedAt, and sets FirstClickedAt only
    /// if it's still null — does nothing if the token doesn't exist (caller already 404s in that
    /// case).
    /// </summary>
    Task RegisterClickAsync(string token, DateTime clickedAt);

    /// <summary>
    /// Creates the click row lazily on its first click (rather than one row per link pre-inserted
    /// at send time regardless of whether it's ever opened), or increments it if this token has
    /// been clicked before.
    /// </summary>
    Task RegisterSignedClickAsync(string token, Guid sentEmailId, string linkKey, string destinationUrl, DateTime clickedAt);
}
