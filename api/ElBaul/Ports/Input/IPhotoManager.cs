using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IPhotoManager
{
    Task<Result<IEnumerable<PhotoDto>>> GetByAlbumIdAsync(Guid albumId);
    Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(Guid baulId);

    Task<Result<PhotoDto>> UploadAsync(
        Guid albumId,
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

    Task<Result<PhotoDto>> MoveAsync(Guid photoId, Guid targetAlbumId);

    Task<Result> DeleteAsync(Guid photoId, string? reason);

    Task<Result<PhotoDto>> ChangeDateAsync(Guid photoId, int year, int? month, int? day);
    Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<Guid> photoIds, int year, int? month, int? day);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text);

    Task<Result<PhotoDownloadResult>> DownloadAsync(Guid photoId);
}
