namespace ElBaul.Core.Sharing.InputPorts;
public record BaulInviteLinkDto(string Token, string Url, DateTime CreatedAt);

public record BaulInviteLinkPreviewDto(
    string BaulId, string Name, string? Description, IReadOnlyList<string> PreviewPhotos,
    string? CoverPhotoUrl, IReadOnlyList<string> PersonaAvatarUrls);

public record BaulInviteLinkLandingDto(
    string Title, string Description, string? ImageUrl, string AppUrl, string BaulName);
