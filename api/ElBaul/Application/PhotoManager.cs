using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class PhotoManager(
    ILogger<PhotoManager> logger,
    IPhotoRepository photoRepository,
    IAlbumRepository albumRepository,
    IBaulRepository baulRepository,
    IPhotoStorage photoStorage,
    IRecuerdoRepository recuerdoRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IPhotoDateExtractor photoDateExtractor) : IPhotoManager
{
    // Recuerdo author names are always the Persona's apodo for this baúl, never the
    // underlying account's OIDC-synced name.
    private async Task<(string Nickname, string? AvatarUrl, string? SharedUserId)> GetAuthorInfoAsync(Guid baulId, string userId)
    {
        var sharedUser = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var avatarUrl = sharedUser?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(sharedUser.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (sharedUser?.Nickname ?? "Usuario", avatarUrl, sharedUser?.Id.ToString());
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetByAlbumIdAsync(Guid albumId)
    {
        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null) return Result.Failure<IEnumerable<PhotoDto>>("Album not found");

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<PhotoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<PhotoDto>>("Access denied");

        var photos = (await photoRepository.GetByAlbumIdAsync(albumId)).ToList();
        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photos.Select(p => p.Id));
        var recuerdoCounts = recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());

        var dtos = new List<PhotoDto>();
        foreach (var photo in photos)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
            dtos.Add(ToDto(photo, thumbnailUrl, fullUrl, recuerdoCounts.GetValueOrDefault(photo.Id)));
        }

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<PhotoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<PhotoDto>>("Access denied");

        var photos = (await photoRepository.GetLooseByBaulIdAsync(baulId)).ToList();
        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photos.Select(p => p.Id));
        var recuerdoCounts = recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());

        var dtos = new List<PhotoDto>();
        foreach (var photo in photos)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
            dtos.Add(ToDto(photo, thumbnailUrl, fullUrl, recuerdoCounts.GetValueOrDefault(photo.Id)));
        }

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoDto>> UploadAsync(
        Guid albumId,
        Stream content,
        string fileName,
        string contentType,
        string? caption,
        (int Year, int? Month, int? Day)? date,
        Guid clientUploadId)
    {
        if (date is { } explicitDate)
        {
            var dateValidationError = ValidateDate(explicitDate.Year, explicitDate.Month, explicitDate.Day);
            if (dateValidationError is not null)
            {
                logger.LogWarning("Photo upload rejected: invalid date {Year}/{Month}/{Day}",
                    explicitDate.Year, explicitDate.Month, explicitDate.Day);
                return Result.Failure<PhotoDto>(dateValidationError);
            }
        }

        var userId = currentUserProvider.GetUserId();
        var album = await albumRepository.GetByIdAsync(albumId);
        if (album is null)
        {
            logger.LogWarning("Photo upload rejected: album not found {AlbumId}", albumId);
            return Result.Failure<PhotoDto>("Album not found");
        }

        var baul = await baulRepository.GetByIdAsync(album.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo upload rejected: baul not found {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<PhotoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(album.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Photo upload rejected: access denied {BaulId} {AlbumId}", album.BaulId, albumId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        if (existingPhoto is not null)
        {
            logger.LogInformation(
                "Duplicate photo upload ignored {BaulId} {AlbumId} {ClientUploadId} {PhotoId}",
                album.BaulId, albumId, clientUploadId, existingPhoto.Id);
            var existingThumbnailUrl = await photoStorage.GetImageUrl(existingPhoto.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var existingFullUrl = await photoStorage.GetImageUrl(existingPhoto.StorageKey, ImagePlacement.PhotoFull);
            return Result.Success(ToDto(existingPhoto, existingThumbnailUrl, existingFullUrl));
        }

        var now = clock.UtcNow();
        var storageKey = $"{userId}/{idGenerator.NewId()}-{fileName}";

        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;
        var (dateYear, dateMonth, dateDay) = ResolvePhotoDate(date, buffered);
        buffered.Position = 0;

        try
        {
            await photoStorage.SaveAsync(storageKey, buffered, contentType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {AlbumId} {FileName} {ContentType} {StorageKey}",
                album.BaulId, albumId, fileName, contentType, storageKey);
            throw;
        }

        var photo = new Photo(idGenerator.NewId(), albumId, album.BaulId, storageKey, caption, dateYear, dateMonth, dateDay, userId, now, clientUploadId);

        try
        {
            await photoRepository.CreateAsync(photo);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while persisting metadata {BaulId} {AlbumId} {PhotoId} {StorageKey}",
                album.BaulId, albumId, photo.Id, storageKey);
            await TryDeleteOrphanedStorageObjectAsync(storageKey);
            throw;
        }

        try
        {
            var updatedAlbum = album with
            {
                PhotoCount = album.PhotoCount + 1,
                CoverPhotoKey = string.IsNullOrEmpty(album.CoverPhotoKey) ? storageKey : album.CoverPhotoKey,
                UpdatedAt = now
            };
            await albumRepository.UpdateAsync(updatedAlbum);
            await baulRepository.UpdateAsync(baul with
            {
                CoverPhotoKey = string.IsNullOrEmpty(baul.CoverPhotoKey) ? storageKey : baul.CoverPhotoKey,
                UpdatedAt = now
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while updating album/baul cover {BaulId} {AlbumId} {PhotoId} {StorageKey}",
                album.BaulId, albumId, photo.Id, storageKey);
            throw;
        }

        logger.LogInformation("Photo uploaded {BaulId} {AlbumId} {PhotoId}", album.BaulId, albumId, photo.Id);

        var thumbnailUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoFull);
        return ToDto(photo, thumbnailUrl, fullUrl);
    }

    public async Task<Result<PhotoDto>> UploadToBaulAsync(
        Guid baulId,
        Stream content,
        string fileName,
        string contentType,
        string? caption,
        (int Year, int? Month, int? Day)? date,
        Guid clientUploadId)
    {
        if (date is { } explicitDate)
        {
            var dateValidationError = ValidateDate(explicitDate.Year, explicitDate.Month, explicitDate.Day);
            if (dateValidationError is not null)
            {
                logger.LogWarning("Loose photo upload rejected: invalid date {Year}/{Month}/{Day}",
                    explicitDate.Year, explicitDate.Month, explicitDate.Day);
                return Result.Failure<PhotoDto>(dateValidationError);
            }
        }

        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Loose photo upload rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PhotoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Loose photo upload rejected: access denied {BaulId}", baulId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        if (existingPhoto is not null)
        {
            logger.LogInformation(
                "Duplicate loose photo upload ignored {BaulId} {ClientUploadId} {PhotoId}",
                baulId, clientUploadId, existingPhoto.Id);
            var existingThumbnailUrl = await photoStorage.GetImageUrl(existingPhoto.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var existingFullUrl = await photoStorage.GetImageUrl(existingPhoto.StorageKey, ImagePlacement.PhotoFull);
            return Result.Success(ToDto(existingPhoto, existingThumbnailUrl, existingFullUrl));
        }

        var now = clock.UtcNow();
        var storageKey = $"{userId}/{idGenerator.NewId()}-{fileName}";

        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;
        var (dateYear, dateMonth, dateDay) = ResolvePhotoDate(date, buffered);
        buffered.Position = 0;

        try
        {
            await photoStorage.SaveAsync(storageKey, buffered, contentType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Loose photo upload failed while saving to storage {BaulId} {FileName} {ContentType} {StorageKey}",
                baulId, fileName, contentType, storageKey);
            throw;
        }

        var photo = new Photo(idGenerator.NewId(), null, baulId, storageKey, caption, dateYear, dateMonth, dateDay, userId, now, clientUploadId);

        try
        {
            await photoRepository.CreateAsync(photo);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Loose photo upload failed while persisting metadata {BaulId} {PhotoId} {StorageKey}",
                baulId, photo.Id, storageKey);
            await TryDeleteOrphanedStorageObjectAsync(storageKey);
            throw;
        }

        try
        {
            await baulRepository.UpdateAsync(baul with
            {
                CoverPhotoKey = string.IsNullOrEmpty(baul.CoverPhotoKey) ? storageKey : baul.CoverPhotoKey,
                UpdatedAt = now
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Loose photo upload failed while updating baul cover {BaulId} {PhotoId} {StorageKey}",
                baulId, photo.Id, storageKey);
            throw;
        }

        logger.LogInformation("Photo uploaded (loose) {BaulId} {PhotoId}", baulId, photo.Id);

        var thumbnailUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoFull);
        return ToDto(photo, thumbnailUrl, fullUrl);
    }

    public async Task<Result<PhotoDto>> MoveAsync(Guid photoId, Guid targetAlbumId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo move rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>("Photo not found");
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo move rejected: baul not found {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Photo move rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        var targetAlbum = await albumRepository.GetByIdAsync(targetAlbumId);
        if (targetAlbum is null || targetAlbum.BaulId != photo.BaulId)
        {
            logger.LogWarning(
                "Photo move rejected: target album not found {BaulId} {PhotoId} {TargetAlbumId}",
                photo.BaulId, photoId, targetAlbumId);
            return Result.Failure<PhotoDto>("Target album not found");
        }

        if (photo.AlbumId == targetAlbumId)
        {
            logger.LogWarning(
                "Photo move rejected: photo already in target album {BaulId} {PhotoId} {TargetAlbumId}",
                photo.BaulId, photoId, targetAlbumId);
            return Result.Failure<PhotoDto>("Photo is already in that album");
        }

        var now = clock.UtcNow();

        if (photo.AlbumId is { } sourceAlbumId)
        {
            var sourceAlbum = await albumRepository.GetByIdAsync(sourceAlbumId);
            if (sourceAlbum is not null)
            {
                await albumRepository.UpdateAsync(sourceAlbum with
                {
                    PhotoCount = Math.Max(0, sourceAlbum.PhotoCount - 1),
                    CoverPhotoKey = sourceAlbum.CoverPhotoKey == photo.StorageKey ? null : sourceAlbum.CoverPhotoKey,
                    UpdatedAt = now
                });
            }
        }

        var updatedPhoto = photo with { AlbumId = targetAlbumId };
        await photoRepository.UpdateAsync(updatedPhoto);

        await albumRepository.UpdateAsync(targetAlbum with
        {
            PhotoCount = targetAlbum.PhotoCount + 1,
            CoverPhotoKey = string.IsNullOrEmpty(targetAlbum.CoverPhotoKey) ? photo.StorageKey : targetAlbum.CoverPhotoKey,
            UpdatedAt = now
        });

        logger.LogInformation(
            "Photo moved {BaulId} {PhotoId} {SourceAlbumId} {TargetAlbumId}",
            photo.BaulId, photoId, photo.AlbumId, targetAlbumId);

        var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
        return ToDto(updatedPhoto, thumbnailUrl, fullUrl);
    }

    public async Task<Result> DeleteAsync(Guid photoId, string? reason)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo delete rejected: photo not found {PhotoId}", photoId);
            return Result.Failure("Photo not found");
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo delete rejected: baul not found {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure("Baul not found");
        }

        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Photo delete rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure("Access denied");
        }

        if (photo.Status == PhotoStatus.Deleted) return Result.Success();

        var updatedPhoto = photo with
        {
            Status = PhotoStatus.Deleted,
            DeletedAt = clock.UtcNow(),
            DeletionReason = reason
        };
        await photoRepository.UpdateAsync(updatedPhoto);

        if (photo.AlbumId is { } albumId)
        {
            var album = await albumRepository.GetByIdAsync(albumId);
            if (album is not null)
            {
                await albumRepository.UpdateAsync(album with { PhotoCount = Math.Max(0, album.PhotoCount - 1) });
            }
        }

        logger.LogInformation("Photo deleted {BaulId} {PhotoId}", photo.BaulId, photoId);
        return Result.Success();
    }

    public async Task<Result<PhotoDto>> ChangeDateAsync(Guid photoId, int year, int? month, int? day)
    {
        var validationError = ValidateDate(year, month, day);
        if (validationError is not null) return Result.Failure<PhotoDto>(validationError);

        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo date change rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>("Photo not found");
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo date change rejected: baul not found {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Photo date change rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        var updatedPhoto = photo with { DateYear = year, DateMonth = month, DateDay = day };
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo date changed {BaulId} {PhotoId}", photo.BaulId, photoId);

        var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
        return ToDto(updatedPhoto, thumbnailUrl, fullUrl);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<Guid> photoIds, int year, int? month, int? day)
    {
        var validationError = ValidateDate(year, month, day);
        if (validationError is not null) return Result.Failure<IEnumerable<PhotoDto>>(validationError);

        var updated = new List<PhotoDto>();
        foreach (var photoId in photoIds)
        {
            var result = await ChangeDateAsync(photoId, year, month, day);
            if (result.IsSuccess)
            {
                updated.Add(result.Value);
            }
            else
            {
                logger.LogWarning("Skipping photo in batch date change {PhotoId}: {Error}", photoId, result.Error);
            }
        }

        return Result.Success<IEnumerable<PhotoDto>>(updated);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Photo not found");

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = await recuerdoRepository.GetByPhotoIdAsync(photoId);
        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(photo.BaulId, recuerdo.UserId);
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, sharedUserId, recuerdo.UserId == userId));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Recuerdo creation rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<RecuerdoDto>("Photo not found");
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Recuerdo creation rejected: baul not found {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<RecuerdoDto>("Baul not found");
        }

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(photo.BaulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(photo.BaulId, userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), photoId, photo.AlbumId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation(
            "Recuerdo created {BaulId} {PhotoId} {RecuerdoId}", photo.BaulId, photoId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, sharedUserId, isOwn: true);
    }

    private (int? Year, int? Month, int? Day) ResolvePhotoDate((int Year, int? Month, int? Day)? explicitDate, Stream content)
    {
        if (explicitDate is { } d) return (d.Year, d.Month, d.Day);

        var extracted = photoDateExtractor.TryExtractDate(content);
        return extracted is { } e ? (e.Year, e.Month, e.Day) : (null, null, null);
    }

    private static string? ValidateDate(int year, int? month, int? day)
    {
        if (year < 1800 || year > DateTime.UtcNow.Year + 1) return "Year is out of range";
        if (month is < 1 or > 12) return "Month is out of range";
        if (day is not null && month is null) return "Day requires a month";
        if (day is < 1 or > 31) return "Day is out of range";
        return null;
    }

    private async Task TryDeleteOrphanedStorageObjectAsync(string storageKey)
    {
        try
        {
            await photoStorage.DeleteAsync(storageKey);
        }
        catch (Exception cleanupEx)
        {
            logger.LogError(cleanupEx,
                "Failed to clean up orphaned storage object {StorageKey} after failed photo insert",
                storageKey);
        }
    }

    private static PhotoDto ToDto(Photo photo, string thumbnailUrl, string fullUrl, int recuerdoCount = 0) =>
        new(photo.Id.ToString(), photo.AlbumId?.ToString(), photo.BaulId.ToString(), thumbnailUrl, fullUrl,
            photo.Caption, photo.DateYear, photo.DateMonth, photo.DateDay, photo.UploadedBy, photo.CreatedAt, recuerdoCount);

    private static RecuerdoDto ToDto(Recuerdo recuerdo, string userName, string? userAvatar, string? sharedUserId, bool isOwn) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, UserAvatar: userAvatar, SharedUserId: sharedUserId);
}
