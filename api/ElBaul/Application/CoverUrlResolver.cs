using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// The single interpretation of "what is this cover photo's URL": an empty/null storage key
/// means no cover; a real key resolves through IPhotoStorage for the given placement. Mirrors
/// PersonaAvatarUrlResolver's role for persona avatars — kept in one place so BaulManager,
/// ChapterManager (both its single-chapter and list-path DTO builders), and
/// BaulInviteLinkManager don't each re-derive the same empty-key/null rule inline.
/// </summary>
public static class CoverUrlResolver
{
    public static async Task<string?> ResolveAsync(string? coverPhotoKey, ImagePlacement placement, IPhotoStorage photoStorage) =>
        coverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(coverPhotoKey, placement)
            : null;
}
