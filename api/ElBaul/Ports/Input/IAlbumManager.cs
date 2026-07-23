using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IAlbumManager
{
    Task<Result<IEnumerable<AlbumDto>>> GetByBaulIdAsync(Guid baulId);
    Task<Result<AlbumDto>> CreateAsync(Guid baulId, string name);
    Task<Result<AlbumDto>> SetCoverAsync(Guid albumId, Guid photoId);
    Task<Result<AlbumDto>> UpdateAsync(Guid albumId, string name);
    Task<Result> DeleteAsync(Guid albumId);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid albumId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid albumId, string text);
}
