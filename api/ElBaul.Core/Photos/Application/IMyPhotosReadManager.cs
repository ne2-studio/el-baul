using Ne2Studio.Common;

namespace ElBaul.Core.Photos.Application;

// Deliberately separate from IPhotoReadManager: every method there takes a BaulId (or a
// PhotoId/ChapterId that resolves to one) and authorizes against that one baúl. "Mis fotos"
// has no baúl to authorize against — the user is the only scope — so it gets its own small
// interface instead of a BaulId-shaped method pretending otherwise.
public interface IMyPhotosReadManager
{
    /// <summary>Every unique PhotoAsset the current authenticated user originally uploaded
    /// (PhotoAsset.UploadedBy), across every baúl it appears in, chronologically ascending by
    /// its intrinsic date (undated last) — never scoped by a client-supplied user or baúl id.</summary>
    Task<Result<PhotoAssetPageDto>> GetMyPhotosAsync(int skip, int take);
}
