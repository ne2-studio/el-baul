using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
namespace ElBaul.Core.Personas.Application;
/// <summary>
/// The single interpretation of "what is this persona's avatar URL": the linked photo wins
/// when it's present, active, and still in this baúl; otherwise fall back to the legacy
/// key-only avatar; otherwise there is no avatar. Crop/zoom always rides along. Kept in one
/// place so PersonaDtoProjector, AuthorInfoProjector, and PhotoPersonaTagManager don't each
/// re-derive the rule — see commit 096b464, which had to patch all three by hand to add crop.
/// </summary>
public static class PersonaAvatarUrlResolver
{
    public static async Task<string?> ResolveAsync(Persona persona, IPhotoRepository? photoRepository, IPhotoStorage photoStorage)
    {
        // No repository to resolve a photo-backed avatar with (some callers construct this
        // without one) is treated the same as "no photo-backed avatar": fall through to the
        // legacy key below, same as the ResolveAsync(Persona, Photo?, ...) overload does for
        // a persona whose AvatarPhotoId is unset.
        if (persona.AvatarPhotoId is { } photoId && photoRepository is not null)
        {
            var avatarPhoto = await photoRepository.GetByIdAsync(photoId);
            return await ResolveAsync(persona, avatarPhoto, photoStorage);
        }

        return persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar,
                new ImageCrop(persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale))
            : null;
    }

    // Batch-friendly overload: the caller has already resolved (or bulk-fetched, e.g. via
    // IPhotoRepository.GetByIdsAsync) whichever Photo backs this persona's avatar, so this
    // does no I/O of its own — used by AuthorInfoProjector.GetManyAsync to turn a single
    // batched photo lookup into N avatar URLs instead of N individual ones.
    public static async Task<string?> ResolveAsync(Persona persona, Photo? avatarPhoto, IPhotoStorage photoStorage)
    {
        var crop = new ImageCrop(persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);

        if (persona.AvatarPhotoId is not null)
        {
            return avatarPhoto is not null && avatarPhoto.BaulId == persona.BaulId && avatarPhoto.Status == PhotoStatus.Active
                ? await photoStorage.GetImageUrl(avatarPhoto.StorageKey, ImagePlacement.PersonaAvatar, crop)
                : null;
        }

        return persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar, crop)
            : null;
    }
}
