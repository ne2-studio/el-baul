using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class PhotoManager(
    ILogger<PhotoManager> logger,
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    IPhotoStorage photoStorage,
    IRecuerdoRepository recuerdoRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IPhotoDateExtractor photoDateExtractor,
    BaulAccessService baulAccess) : IPhotoManager
{
    // Recuerdo author names are always the Persona's apodo for this baúl, never the
    // underlying account's OIDC-synced name.
    private async Task<(string Nickname, string? AvatarUrl, string? PersonaId)> GetAuthorInfoAsync(Guid baulId, string userId)
    {
        var persona = await baulRepository.GetPersonaByUserIdAsync(baulId, userId);
        var avatarUrl = persona?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (persona?.Nickname ?? "Usuario", avatarUrl, persona?.Id.ToString());
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(Guid chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null) return Result.Failure<IEnumerable<PhotoDto>>("Chapter not found");

        var baul = await baulRepository.GetByIdAsync(chapter.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<PhotoDto>>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<PhotoDto>>("Access denied");

        var photos = (await photoRepository.GetByChapterIdAsync(chapterId)).ToList();
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<PhotoDto>>("Access denied");

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
        Guid chapterId,
        Stream content,
        string fileName,
        string contentType,
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
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Photo upload rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<PhotoDto>("Chapter not found");
        }

        var baul = await baulRepository.GetByIdAsync(chapter.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo upload rejected: baul not found {BaulId} {ChapterId}", chapter.BaulId, chapterId);
            return Result.Failure<PhotoDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Photo upload rejected: access denied {BaulId} {ChapterId}", chapter.BaulId, chapterId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        return await UploadPhotoAsync(baul, chapter, content, fileName, contentType, date, clientUploadId, userId);
    }

    public async Task<Result<PhotoDto>> UploadToBaulAsync(
        Guid baulId,
        Stream content,
        string fileName,
        string contentType,
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Loose photo upload rejected: access denied {BaulId}", baulId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        return await UploadPhotoAsync(baul, null, content, fileName, contentType, date, clientUploadId, userId);
    }

    private async Task<Result<PhotoDto>> UploadPhotoAsync(
        Baul baul,
        Chapter? chapter,
        Stream content,
        string fileName,
        string contentType,
        (int Year, int? Month, int? Day)? date,
        Guid clientUploadId,
        string userId)
    {
        var chapterId = chapter?.Id;

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        if (existingPhoto is not null)
        {
            logger.LogInformation(
                "Duplicate photo upload ignored {BaulId} {ChapterId} {ClientUploadId} {PhotoId}",
                baul.Id, chapterId, clientUploadId, existingPhoto.Id);
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
                "Photo upload failed while saving to storage {BaulId} {ChapterId} {FileName} {ContentType} {StorageKey}",
                baul.Id, chapterId, fileName, contentType, storageKey);
            throw;
        }

        var photo = new Photo(idGenerator.NewId(), chapterId, baul.Id, storageKey, dateYear, dateMonth, dateDay, userId, now, clientUploadId);

        try
        {
            await photoRepository.CreateAsync(photo);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while persisting metadata {BaulId} {ChapterId} {PhotoId} {StorageKey}",
                baul.Id, chapterId, photo.Id, storageKey);
            await TryDeleteOrphanedStorageObjectAsync(storageKey);
            throw;
        }

        try
        {
            if (chapter is not null)
            {
                await chapterRepository.UpdateAsync(chapter with
                {
                    PhotoCount = chapter.PhotoCount + 1,
                    CoverPhotoKey = string.IsNullOrEmpty(chapter.CoverPhotoKey) ? storageKey : chapter.CoverPhotoKey,
                    UpdatedAt = now
                });
            }

            await baulRepository.UpdateAsync(baul with
            {
                CoverPhotoKey = string.IsNullOrEmpty(baul.CoverPhotoKey) ? storageKey : baul.CoverPhotoKey,
                UpdatedAt = now
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while updating chapter/baul cover {BaulId} {ChapterId} {PhotoId} {StorageKey}",
                baul.Id, chapterId, photo.Id, storageKey);
            throw;
        }

        logger.LogInformation("Photo uploaded {BaulId} {ChapterId} {PhotoId}", baul.Id, chapterId, photo.Id);

        var thumbnailUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(storageKey, ImagePlacement.PhotoFull);
        return ToDto(photo, thumbnailUrl, fullUrl);
    }

    public async Task<Result<PhotoDto>> MoveAsync(Guid photoId, Guid targetChapterId)
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Photo move rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDto>("Access denied");
        }

        var targetChapter = await chapterRepository.GetByIdAsync(targetChapterId);
        if (targetChapter is null || targetChapter.BaulId != photo.BaulId)
        {
            logger.LogWarning(
                "Photo move rejected: target chapter not found {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>("Target chapter not found");
        }

        if (photo.ChapterId == targetChapterId)
        {
            logger.LogWarning(
                "Photo move rejected: photo already in target chapter {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>("Photo is already in that chapter");
        }

        var now = clock.UtcNow();

        if (photo.ChapterId is { } sourceChapterId)
        {
            var sourceChapter = await chapterRepository.GetByIdAsync(sourceChapterId);
            if (sourceChapter is not null)
            {
                await chapterRepository.UpdateAsync(sourceChapter with
                {
                    PhotoCount = Math.Max(0, sourceChapter.PhotoCount - 1),
                    CoverPhotoKey = sourceChapter.CoverPhotoKey == photo.StorageKey ? null : sourceChapter.CoverPhotoKey,
                    UpdatedAt = now
                });
            }
        }

        var updatedPhoto = photo with { ChapterId = targetChapterId };
        await photoRepository.UpdateAsync(updatedPhoto);

        await chapterRepository.UpdateAsync(targetChapter with
        {
            PhotoCount = targetChapter.PhotoCount + 1,
            CoverPhotoKey = string.IsNullOrEmpty(targetChapter.CoverPhotoKey) ? photo.StorageKey : targetChapter.CoverPhotoKey,
            UpdatedAt = now
        });

        logger.LogInformation(
            "Photo moved {BaulId} {PhotoId} {SourceChapterId} {TargetChapterId}",
            photo.BaulId, photoId, photo.ChapterId, targetChapterId);

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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
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

        if (photo.ChapterId is { } chapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(chapterId);
            if (chapter is not null)
            {
                await chapterRepository.UpdateAsync(chapter with { PhotoCount = Math.Max(0, chapter.PhotoCount - 1) });
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = await recuerdoRepository.GetByPhotoIdAsync(photoId);
        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(photo.BaulId, recuerdo.UserId);
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId));
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

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(photo.BaulId, userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), photoId, photo.ChapterId, photo.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation(
            "Recuerdo created {BaulId} {PhotoId} {RecuerdoId}", photo.BaulId, photoId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true);
    }

    public async Task<Result<PhotoDownloadResult>> DownloadAsync(Guid photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo download rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDownloadResult>("Photo not found");
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is null)
        {
            logger.LogWarning("Photo download rejected: baul not found {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDownloadResult>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Photo download rejected: access denied {BaulId} {PhotoId}", photo.BaulId, photoId);
            return Result.Failure<PhotoDownloadResult>("Access denied");
        }

        var content = await photoStorage.OpenReadForDownloadAsync(photo.StorageKey);
        return new PhotoDownloadResult(content.Content, content.ContentType, ExtractOriginalFileName(photo.StorageKey));
    }

    // storageKey is always "{userId}/{36-char guid}-{originalFileName}" (see UploadAsync/
    // UploadToBaulAsync below) — strip the guid prefix back off to recover a friendly
    // download filename instead of exposing the storage key's internals to the user.
    private static string ExtractOriginalFileName(string storageKey)
    {
        var lastSegment = storageKey[(storageKey.LastIndexOf('/') + 1)..];
        const int guidAndDashLength = 37;
        return lastSegment.Length > guidAndDashLength ? lastSegment[guidAndDashLength..] : lastSegment;
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
        new(photo.Id.ToString(), photo.ChapterId?.ToString(), photo.BaulId.ToString(), thumbnailUrl, fullUrl,
            photo.DateYear, photo.DateMonth, photo.DateDay, photo.UploadedBy, photo.CreatedAt, recuerdoCount);

    private static RecuerdoDto ToDto(Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, UserAvatar: userAvatar, PersonaId: personaId);
}
