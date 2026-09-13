using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Photos.Application;

// Deliberately separate from IPhotoReadManager: every method there takes a BaulId (or a
// PhotoId/ChapterId that resolves to one) and authorizes against that one baúl. "Mis fotos"
// has no baúl to authorize against — the user is the only scope — so it gets its own small
// interface instead of a BaulId-shaped method pretending otherwise.
public interface IMyPhotosReadManager
{
    /// <summary>Every PhotoAsset the current authenticated user has a UserPhotoAsset relation to
    /// (Slice 2.5, docs/.backlog issue #62), chronologically ascending by its intrinsic date
    /// (undated last) — never scoped by a client-supplied user or baúl id.
    /// <paramref name="unsharedOnly"/> narrows this to "Sin compartir" (Slice 3): assets with
    /// zero active Photo projections in any baúl the caller can access — see
    /// MyPhotosReadManager's own doc comment on why that's the right scope, not a global
    /// PhotoAsset.Photos.Any() across every user.</summary>
    Task<Result<PhotoAssetPageDto>> GetMyPhotosAsync(int skip, int take, bool unsharedOnly = false);

    /// <summary>Single-asset counterpart to GetMyPhotosAsync's per-item projection — used right
    /// after ingesting a new asset directly into Mis fotos (PhotoManager.UploadToMyPhotosAsync,
    /// Slice 3) to hand back the exact same shape the gallery would show for it, including any
    /// baúl appearances it may already have (e.g. an exact duplicate of a photo already shared
    /// to a baúl).</summary>
    Task<PhotoAssetDto> ProjectAsync(PhotoAsset asset, UserId userId);
}
