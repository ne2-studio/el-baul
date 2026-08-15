namespace ElBaul.Core.Sharing.InputPorts;
public record CreateSharedLinkResult(string Url, string Token);

public record SharedLinkLandingDto(
    string Title,
    string Description,
    string? ImageUrl,
    string AppUrl,
    string? RecuerdoText,
    string? AuthorName,
    DateTime CreatedAt);
