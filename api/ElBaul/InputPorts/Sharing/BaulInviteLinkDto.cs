namespace ElBaul.InputPorts.Sharing;
public record BaulInviteLinkDto(string Token, string Url, DateTime CreatedAt);

public record BaulInviteLinkPreviewDto(
    string BaulId, string Name, string? Description, IReadOnlyList<string> PreviewPhotos,
    string? CoverPhotoUrl, IReadOnlyList<string> PersonaAvatarUrls);
