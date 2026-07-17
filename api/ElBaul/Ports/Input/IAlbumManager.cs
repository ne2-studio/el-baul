using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IAlbumManager
{
    Task<Result<IEnumerable<AlbumDto>>> GetByBaulIdAsync(Guid baulId);
    Task<Result<AlbumDto>> CreateAsync(Guid baulId, string name, string? description);
    Task<Result<AlbumDto>> SetCoverAsync(Guid albumId, Guid photoId);
}
