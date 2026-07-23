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
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : IAlbumManager
{
    // Recuerdo/album author names are always the Persona's apodo for this baúl, never
    // the underlying account's OIDC-synced name — a nickname is what the family chose,
    // and the account name may be unrelated or unset.
    private async Task<(string Nickname, string? AvatarUrl, string? SharedUserId)> GetAuthorInfoAsync(Guid baulId, string userId)
    {
        var sharedUser = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var avatarUrl = sharedUser?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(sharedUser.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (sharedUser?.Nickname ?? "Usuario", avatarUrl, sharedUser?.Id.ToString());
    }

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

        // Chronological: dated albums first (oldest min date first, so the baúl reads like a
        // story), undated-only albums last.
        var sorted = dtos
            .OrderByDescending(d => d.MinDateYear.HasValue)
            .ThenBy(d => d.MinDateYear ?? int.MinValue)
            .ThenBy(d => d.MinDateMonth ?? 1)
            .ThenBy(d => d.MinDateDay ?? 1)
            .ThenBy(d => d.UpdatedAt)
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

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess)
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

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess)
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

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Album update rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<AlbumDto>("Access denied");
        }

        var updated = album with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await albumRepository.UpdateAsync(updated);

        logger.LogInformation("Album updated {BaulId} {AlbumId} {Name}", album.BaulId, albumId, name);
        return await ToDtoAsync(updated);
    }

    public async Task<Result> DeleteAsync(Guid albumId)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null)
        {
            logger.LogWarning("Album delete rejected: album not found {AlbumId}", albumId);
            return Result.Failure("Album not found");
        }

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Album delete rejected: baul not found {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure("Baul not found");
        }

        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Album delete rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure("Access denied");
        }

        var photos = await photoRepository.GetByAlbumIdAsync(albumId);
        foreach (var photo in photos)
            await photoRepository.UpdateAsync(photo with { AlbumId = null });

        var recuerdos = await recuerdoRepository.GetByAlbumIdAsync(albumId);
        foreach (var recuerdo in recuerdos)
            await recuerdoRepository.UpdateAsync(recuerdo with { AlbumId = null });

        await albumRepository.DeleteAsync(albumId);
        await baulRepository.UpdateAsync(baul with { AlbumCount = baul.AlbumCount - 1, UpdatedAt = clock.UtcNow() });

        logger.LogInformation("Album deleted {BaulId} {AlbumId}", album.BaulId, albumId);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid albumId)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Album not found");

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = (await recuerdoRepository.GetByAlbumIdAsync(albumId)).ToList();

        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var thumbnailUrls = new Dictionary<Guid, string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is not null)
                thumbnailUrls[photoId] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        }

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(album.BaulId, recuerdo.UserId);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            dtos.Add(ToRecuerdoDto(recuerdo, nickname, avatarUrl, sharedUserId, recuerdo.UserId == userId, thumbnailUrl, album.Name));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid albumId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null)
        {
            logger.LogWarning("Recuerdo creation rejected: album not found {AlbumId}", albumId);
            return Result.Failure<RecuerdoDto>("Album not found");
        }

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Recuerdo creation rejected: baul not found {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<RecuerdoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(album.BaulId, userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), null, albumId, album.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {AlbumId} {RecuerdoId}", album.BaulId, albumId, recuerdo.Id);

        return ToRecuerdoDto(recuerdo, nickname, avatarUrl, sharedUserId, isOwn: true, photoThumbnailUrl: null, albumName: album.Name);
    }

    private static RecuerdoDto ToRecuerdoDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? sharedUserId, bool isOwn, string? photoThumbnailUrl,
        string? albumName = null) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, sharedUserId, recuerdo.AlbumId?.ToString(), albumName);

    private async Task<AlbumDto> ToDtoAsync(Album album)
    {
        var coverUrl = album.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCover)
            : null;
        var featuredCoverUrl = album.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(album.CoverPhotoKey, ImagePlacement.AlbumCoverFeatured)
            : null;

        var photos = (await photoRepository.GetByAlbumIdAsync(album.Id)).ToList();
        var recuerdos = (await recuerdoRepository.GetByAlbumIdAsync(album.Id)).ToList();
        var latestRecuerdo = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        var latestAuthor = latestRecuerdo is null
            ? null
            : (await GetAuthorInfoAsync(album.BaulId, latestRecuerdo.UserId)).Nickname;

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
