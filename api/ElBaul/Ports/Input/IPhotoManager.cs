using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IPhotoManager
{
    Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(ChapterId chapterId);
    Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(BaulId baulId);
    Task<Result<PhotoPageDto>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    Task<Result<PhotoDto>> UploadAsync(
        ChapterId chapterId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
        ClientUploadId clientUploadId);

    Task<Result<PhotoDto>> UploadToBaulAsync(
        BaulId baulId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
        ClientUploadId clientUploadId);

    Task<Result<PhotoDto>> MoveAsync(PhotoId photoId, ChapterId targetChapterId);

    Task<Result> DeleteAsync(PhotoId photoId, string? reason);

    Task<Result<PhotoDto>> ChangeDateAsync(PhotoId photoId, PhotoDate date);
    Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<PhotoId> photoIds, PhotoDate date);

    Task<Result<PhotoDownloadResult>> DownloadAsync(PhotoId photoId);

    Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(BaulId baulId, PersonaId personaId);
}
