using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Application;

public interface IPhotoDtoProjector
{
    Task<PhotoDto> ProjectAsync(Photo photo);
    Task<List<PhotoDto>> ProjectAsync(IEnumerable<Photo> photos);

    /// <summary>Builds DTOs from IPhotoListReadModel rows, which already carry a batched
    /// recuerdo count — no further DB work here beyond per-photo URL building (IPhotoStorage,
    /// not a DB round trip). Used by every PhotoManager listing method; ProjectAsync(Photo/
    /// IEnumerable&lt;Photo&gt;) stays the right call for single-item and write-result paths.</summary>
    Task<List<PhotoDto>> ProjectAsync(IEnumerable<PhotoListRow> rows);
}
