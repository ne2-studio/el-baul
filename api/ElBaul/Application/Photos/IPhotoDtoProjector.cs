using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Photos;

using ElBaul.Domain;
namespace ElBaul.Application.Photos;
public interface IPhotoDtoProjector
{
    // isAdmin/currentUserId feed PhotoDeletePolicy for every photo in the batch — the caller's
    // own baúl-access check (already done before reaching here) is the only place these two
    // values come from, so a projected DTO's CanDelete/CanRequestRemoval always reflects the
    // same authorization the manager itself would apply.
    Task<PhotoDto> ProjectAsync(Photo photo, bool isAdmin, UserId currentUserId);
    Task<List<PhotoDto>> ProjectAsync(IEnumerable<Photo> photos, bool isAdmin, UserId currentUserId);

    /// <summary>Builds DTOs from IPhotoListReadModel rows, which already carry a batched
    /// recuerdo count — no further DB work here beyond per-photo URL building (IPhotoStorage,
    /// not a DB round trip). Used by every PhotoManager listing method; ProjectAsync(Photo/
    /// IEnumerable&lt;Photo&gt;) stays the right call for single-item and write-result paths.</summary>
    Task<List<PhotoDto>> ProjectAsync(IEnumerable<PhotoListRow> rows, bool isAdmin, UserId currentUserId);
}
