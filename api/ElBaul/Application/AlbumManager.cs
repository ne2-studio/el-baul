using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class AlbumManager(
    IAlbumRepository albumRepository,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IUserRepository userRepository,
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
            var featuredCoverUrl = album.CoverPhotoKey is { Length: > 0 }
                ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCoverFeatured)
                : null;

            var photoIds = (await photoRepository.GetByAlbumIdAsync(album.Id)).Select(p => p.Id).ToList();
            var recuerdos = (await recuerdoRepository.GetByPhotoIdsAsync(photoIds)).ToList();
            var latestRecuerdo = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
            var latestAuthor = latestRecuerdo is null
                ? null
                : (await userRepository.GetByIdAsync(latestRecuerdo.UserId))?.Name;

            dtos.Add(ToDto(album, coverUrl, featuredCoverUrl, recuerdos.Count, latestRecuerdo?.Text, latestAuthor));
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

        return ToDto(album, null, null, 0, null, null);
    }

    private static AlbumDto ToDto(
        Album album, string? coverUrl, string? featuredCoverUrl, int recuerdoCount,
        string? latestRecuerdoText, string? latestRecuerdoAuthor) =>
        new(album.Id.ToString(), album.BaulId.ToString(), album.Name, album.Description,
            album.PhotoCount, coverUrl, featuredCoverUrl, album.CreatedAt, album.UpdatedAt,
            recuerdoCount, latestRecuerdoText, latestRecuerdoAuthor);
}
