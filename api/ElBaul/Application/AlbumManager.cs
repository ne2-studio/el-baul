using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class AlbumManager(
    IAlbumRepository albumRepository,
    IBaulRepository baulRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : IAlbumManager
{
    public async Task<Result<IEnumerable<AlbumDto>>> GetByBaulIdAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<AlbumDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<AlbumDto>>("Access denied");

        var albums = await albumRepository.GetByBaulIdAsync(baulId);
        var dtos = new List<AlbumDto>();
        foreach (var album in albums)
        {
            var coverUrl = album.CoverPhotoKey is { Length: > 0 }
                ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCover)
                : null;
            dtos.Add(ToDto(album, coverUrl));
        }

        return Result.Success<IEnumerable<AlbumDto>>(dtos);
    }

    public async Task<Result<AlbumDto>> CreateAsync(Guid baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<AlbumDto>("Baul not found");

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var canEdit = isCustodio || sharedAccess?.Role == BaulRole.Colaborador;
        if (!canEdit) return Result.Failure<AlbumDto>("Access denied");

        var now = clock.UtcNow();
        var album = new Album(idGenerator.NewId(), baulId, name, description, 0, null, now, now);
        await albumRepository.CreateAsync(album);

        await baulRepository.UpdateAsync(baul with { AlbumCount = baul.AlbumCount + 1, UpdatedAt = now });

        return ToDto(album, null);
    }

    private static AlbumDto ToDto(Album album, string? coverUrl) =>
        new(album.Id.ToString(), album.BaulId.ToString(), album.Name, album.Description,
            album.PhotoCount, coverUrl, album.CreatedAt, album.UpdatedAt);
}
