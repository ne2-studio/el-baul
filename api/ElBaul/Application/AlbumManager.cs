using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

using DateRange = (int? MinY, int? MinM, int? MinD, int? MaxY, int? MaxM, int? MaxD, int Undated);

public class AlbumManager(
    ILogger<AlbumManager> logger,
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
            dtos.Add(await ToDtoAsync(album));

        // Chronological: dated albums first (most recent min date first), undated-only albums last.
        var sorted = dtos
            .OrderByDescending(d => d.MinDateYear.HasValue)
            .ThenByDescending(d => d.MinDateYear ?? int.MinValue)
            .ThenByDescending(d => d.MinDateMonth ?? 1)
            .ThenByDescending(d => d.MinDateDay ?? 1)
            .ThenByDescending(d => d.UpdatedAt)
            .ToList();

        return Result.Success<IEnumerable<AlbumDto>>(sorted);
    }

    public async Task<Result<AlbumDto>> CreateAsync(Guid baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Album creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<AlbumDto>("Baul not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var canEdit = isCustodio || sharedAccess?.Role == BaulRole.Colaborador;
        if (!canEdit)
        {
            logger.LogWarning("Album creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<AlbumDto>("Access denied");
        }

        var now = clock.UtcNow();
        var album = new Album(idGenerator.NewId(), baulId, name, description, 0, null, now, now);
        await albumRepository.CreateAsync(album);

        await baulRepository.UpdateAsync(baul with { AlbumCount = baul.AlbumCount + 1, UpdatedAt = now });

        logger.LogInformation("Album created {BaulId} {AlbumId} {Name}", baulId, album.Id, name);
        return ToDto(album, null, null, 0, null, null, EmptyDateRange);
    }

    public async Task<Result<AlbumDto>> SetCoverAsync(Guid albumId, Guid photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null)
        {
            logger.LogWarning("Album cover update rejected: album not found {AlbumId}", albumId);
            return Result.Failure<AlbumDto>("Album not found");
        }

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Album cover update rejected: baul not found {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<AlbumDto>("Baul not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId);
        var canEdit = isCustodio || sharedAccess?.Role == BaulRole.Colaborador;
        if (!canEdit)
        {
            logger.LogWarning("Album cover update rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<AlbumDto>("Access denied");
        }

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.AlbumId != albumId)
        {
            logger.LogWarning(
                "Album cover update rejected: photo not found {BaulId} {AlbumId} {PhotoId}",
                album.BaulId, albumId, photoId);
            return Result.Failure<AlbumDto>("Photo not found");
        }

        var updated = album with { CoverPhotoKey = photo.StorageKey, UpdatedAt = clock.UtcNow() };
        await albumRepository.UpdateAsync(updated);

        logger.LogInformation("Album cover updated {BaulId} {AlbumId} {PhotoId}", album.BaulId, albumId, photoId);
        return await ToDtoAsync(updated);
    }

    public async Task<Result<AlbumDto>> UpdateAsync(Guid albumId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null)
        {
            logger.LogWarning("Album update rejected: album not found {AlbumId}", albumId);
            return Result.Failure<AlbumDto>("Album not found");
        }

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Album update rejected: baul not found {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<AlbumDto>("Baul not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId);
        var canEdit = isCustodio || sharedAccess?.Role == BaulRole.Colaborador;
        if (!canEdit)
        {
            logger.LogWarning("Album update rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<AlbumDto>("Access denied");
        }

        var updated = album with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await albumRepository.UpdateAsync(updated);

        logger.LogInformation("Album updated {BaulId} {AlbumId} {Name}", album.BaulId, albumId, name);
        return await ToDtoAsync(updated);
    }

    private async Task<AlbumDto> ToDtoAsync(Album album)
    {
        var coverUrl = album.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCover)
            : null;
        var featuredCoverUrl = album.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCoverFeatured)
            : null;

        var photos = (await photoRepository.GetByAlbumIdAsync(album.Id)).ToList();
        var photoIds = photos.Select(p => p.Id).ToList();
        var recuerdos = (await recuerdoRepository.GetByPhotoIdsAsync(photoIds)).ToList();
        var latestRecuerdo = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        var latestAuthor = latestRecuerdo is null
            ? null
            : (await userRepository.GetByIdAsync(latestRecuerdo.UserId))?.Name;

        var dateRange = ComputeDateRange(photos);

        return ToDto(album, coverUrl, featuredCoverUrl, recuerdos.Count, latestRecuerdo?.Text, latestAuthor, dateRange);
    }

    private static readonly DateRange EmptyDateRange = (null, null, null, null, null, null, 0);

    private static DateRange ComputeDateRange(IReadOnlyCollection<Photo> photos)
    {
        var dated = photos.Where(p => p.DateYear.HasValue).ToList();
        var undatedCount = photos.Count - dated.Count;
        if (dated.Count == 0) return (null, null, null, null, null, null, undatedCount);

        var min = dated.OrderBy(p => p.DateYear).ThenBy(p => p.DateMonth ?? 1).ThenBy(p => p.DateDay ?? 1).First();
        var max = dated.OrderByDescending(p => p.DateYear).ThenByDescending(p => p.DateMonth ?? 1).ThenByDescending(p => p.DateDay ?? 1).First();

        return (min.DateYear, min.DateMonth, min.DateDay, max.DateYear, max.DateMonth, max.DateDay, undatedCount);
    }

    private static AlbumDto ToDto(
        Album album, string? coverUrl, string? featuredCoverUrl, int recuerdoCount,
        string? latestRecuerdoText, string? latestRecuerdoAuthor, DateRange dateRange) =>
        new(album.Id.ToString(), album.BaulId.ToString(), album.Name, album.Description,
            album.PhotoCount, coverUrl, featuredCoverUrl, album.CreatedAt, album.UpdatedAt,
            recuerdoCount, latestRecuerdoText, latestRecuerdoAuthor,
            dateRange.MinY, dateRange.MinM, dateRange.MinD, dateRange.MaxY, dateRange.MaxM, dateRange.MaxD, dateRange.Undated);
}
