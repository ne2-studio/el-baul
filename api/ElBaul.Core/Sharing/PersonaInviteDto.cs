namespace ElBaul.Core.Sharing;
// Response to "Invitar" — the persona's invite link, issued lazily and re-shared (never
// regenerated) on every subsequent tap while the persona stays Pending. See
// PersonaInviteManager.InviteAsync.
public record PersonaInviteDto(string Token, string Url);

public record PersonaInvitePreviewDto(
    string BaulId, string Name, string? Description, IReadOnlyList<string> PreviewPhotos,
    string? CoverPhotoUrl, IReadOnlyList<string> PersonaAvatarUrls);

public record PersonaInviteLandingDto(
    string Title, string Description, string? ImageUrl, string AppUrl, string BaulName);
