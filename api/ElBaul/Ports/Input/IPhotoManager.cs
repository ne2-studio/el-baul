using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IPhotoManager
{
    Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(Guid chapterId);
    Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(Guid baulId);
    Task<Result<PhotoPageDto>> GetPageAsync(Guid baulId, Guid? chapterId, int skip, int take);

    Task<Result<PhotoDto>> UploadAsync(
        Guid chapterId,
        Stream content,
        string fileName,
        string contentType,
        (int Year, int? Month, int? Day)? date,
        Guid clientUploadId);

    Task<Result<PhotoDto>> UploadToBaulAsync(
        Guid baulId,
        Stream content,
        string fileName,
        string contentType,
        (int Year, int? Month, int? Day)? date,
        Guid clientUploadId);

    Task<Result<PhotoDto>> MoveAsync(Guid photoId, Guid targetChapterId);

    Task<Result> DeleteAsync(Guid photoId, string? reason);

    Task<Result<PhotoDto>> ChangeDateAsync(Guid photoId, int year, int? month, int? day);
    Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<Guid> photoIds, int year, int? month, int? day);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text);

    Task<Result<PhotoDownloadResult>> DownloadAsync(Guid photoId);

    Task<Result<IEnumerable<TaggedPersonaDto>>> GetTaggedPersonasAsync(Guid photoId);
    Task<Result<IEnumerable<TaggedPersonaDto>>> SetTaggedPersonasAsync(Guid photoId, IEnumerable<Guid> personaIds);
    Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(Guid baulId, Guid personaId);

    /// <summary>Adds (not replaces) the given personas to every listed photo's existing tag
    /// set — the multi-select "etiquetar personas" batch action, as opposed to
    /// SetTaggedPersonasAsync's replace-all semantics from the single-photo viewer.</summary>
    Task<Result<IEnumerable<string>>> AddTaggedPersonasBatchAsync(Guid baulId, IEnumerable<Guid> photoIds, IEnumerable<Guid> personaIds);
}
