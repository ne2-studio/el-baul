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
        string? caption,
        DateTime? date);

    Task<Result<PhotoDto>> UploadToBaulAsync(
        Guid baulId,
        Stream content,
        string fileName,
        string contentType,
        string? caption,
        DateTime? date);

    Task<Result<PhotoDto>> MoveAsync(Guid photoId, Guid targetAlbumId);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text);
}
