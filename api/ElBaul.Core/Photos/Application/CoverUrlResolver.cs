using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;
/// <summary>
/// The single interpretation of "what is this cover photo's URL": the linked photo wins when
/// it's present and still active in this baúl; otherwise there is no cover. Mirrors
/// PersonaAvatarUrlResolver's role for persona avatars — kept in one place so BaulManager,
/// ChapterManager (both its single-chapter and list-path DTO builders), BaulFeedManager and
/// BaulInviteLinkManager don't each re-derive the same rule inline.
/// </summary>
public static class CoverUrlResolver
{
    public static async Task<string?> ResolveAsync(
        PhotoId? coverPhotoId, BaulId baulId, ImagePlacement placement, IPhotoRepository photoRepository,
        IPhotoStorage photoStorage, ImageCrop? crop = null)
    {
        if (coverPhotoId is not { } id) return null;

        var coverPhoto = await photoRepository.GetByIdAsync(id);
        return await ResolveAsync(coverPhoto, baulId, placement, photoStorage, crop);
    }

    // Batch-friendly overload: the caller has already resolved (or bulk-fetched) whichever Photo
    // backs this cover, so this does no I/O of its own — used by ChapterManager's list-path DTO
    // builder to turn a single batched photo lookup into N cover URLs instead of N individual
    // ones, the same shape AuthorInfoProjector.GetManyAsync uses for avatars.
    public static async Task<string?> ResolveAsync(
        Photo? coverPhoto, BaulId baulId, ImagePlacement placement, IPhotoStorage photoStorage, ImageCrop? crop = null) =>
        coverPhoto is not null && coverPhoto.BaulId == baulId && coverPhoto.Status == PhotoStatus.Active
            ? await photoStorage.GetImageUrl(coverPhoto.StorageKey, placement, crop)
            : null;
}
