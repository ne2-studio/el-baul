namespace ElBaul.Ports.Input;

public record BaulInviteLinkDto(string Token, string Url, DateTime CreatedAt);

public record BaulInviteLinkPreviewDto(
    string BaulId, string Name, string? Description, IReadOnlyList<string> PreviewPhotos);
