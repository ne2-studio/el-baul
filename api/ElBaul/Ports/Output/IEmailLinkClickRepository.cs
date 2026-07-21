namespace ElBaul.Ports.Output;

public interface IEmailLinkClickRepository
{
    Task<EmailLinkClick?> GetByTokenAsync(string token);
    Task CreateManyAsync(IEnumerable<EmailLinkClick> links);

    /// <summary>
    /// Increments ClickCount, sets LastClickedAt, and sets FirstClickedAt only if it's still
    /// null — does nothing if the token doesn't exist (caller already 404s in that case).
    /// </summary>
    Task RegisterClickAsync(string token, DateTime clickedAt);
}
