using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;
/// <summary>
/// The single interpretation of "what is this cover photo's URL": the linked photo wins when
/// it's present and still active in this baúl; otherwise there is no cover. Mirrors
/// PersonaAvatarUrlResolver's role for persona avatars — kept in one place so BaulManager,
/// ChapterManager (both its single-chapter and list-path DTO builders) and BaulFeedManager don't
/// each re-derive the same rule inline. Takes an already-resolved Photo rather than a PhotoId on
/// purpose: every one of those callers already has (or batch-fetches) the Photo anyway, so
/// resolving it here too would mean doing that lookup twice or hiding an extra round trip inside
/// what looks like a pure function. BaulInviteLinkManager's two call sites are the only ones that
/// start from just a PhotoId — they resolve it via IPhotoRepository themselves before calling in.
/// </summary>
public class CoverUrlResolver(IPhotoStorage photoStorage)
{
    public async Task<string?> ResolveAsync(Photo? coverPhoto, BaulId baulId, ImagePlacement placement, ImageCrop? crop = null) =>
        coverPhoto is not null && coverPhoto.BaulId == baulId && coverPhoto.Status == PhotoStatus.Active
            ? await photoStorage.GetImageUrl(coverPhoto.StorageKey, placement, crop, coverPhoto.Dimensions)
            : null;
}
