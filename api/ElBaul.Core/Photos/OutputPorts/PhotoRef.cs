using ElBaul.Domain;
namespace ElBaul.Core.Photos.OutputPorts;

/// <summary>
/// The minimal slice of a Photo another feature needs when all it cares about is "this photo
/// exists, here's its id and storage key" — e.g. Chapter/Baul's denormalized PhotoCount and
/// CoverPhotoId bookkeeping (see IChapterPhotoCountListener, IBaulPhotoCoverListener).
/// Deliberately not the full Photo entity: a consumer holding a PhotoRef gets exactly these two
/// fields, not read/write access to everything else Photo carries (tags, dates, size, hash...).
/// Lives in OutputPorts, not Photos' root: it's still part of the entity's own shape, not a
/// use-case surface — ArchitectureTests enforces InputPorts (feature root) and OutputPorts never
/// depending on each other, so this can't sit at the root next to IPhotoManager while still
/// referencing Photo.
/// </summary>
public readonly record struct PhotoRef(PhotoId Id, string StorageKey)
{
    public static PhotoRef From(Photo photo) => new(photo.Id, photo.StorageKey);
}
