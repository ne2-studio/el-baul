using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// The single interpretation of "what is this persona's avatar URL": the linked photo wins
/// when it's present, active, and still in this baúl; otherwise fall back to the legacy
/// key-only avatar; otherwise there is no avatar. Crop/zoom always rides along. Kept in one
/// place so PersonaDtoProjector, BaulAccessService, and PhotoPersonaTagManager don't each
/// re-derive the rule — see commit 096b464, which had to patch all three by hand to add crop.
/// </summary>
public static class PersonaAvatarUrlResolver
{
    public static async Task<string?> ResolveAsync(Persona persona, IPhotoRepository? photoRepository, IPhotoStorage photoStorage)
    {
        var crop = new ImageCrop(persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);

        if (persona.AvatarPhotoId is { } photoId && photoRepository is not null)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            return photo is not null && photo.BaulId == persona.BaulId && photo.Status == PhotoStatus.Active
                ? await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PersonaAvatar, crop)
                : null;
        }

        return persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar, crop)
            : null;
    }
}
