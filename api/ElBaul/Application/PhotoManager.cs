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
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository) : IPhotoManager
{
    public async Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(Guid chapterId)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null) return Result.Failure<IEnumerable<PhotoDto>>("Chapter not found");

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photos by chapter", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var photos = await photoRepository.GetByChapterIdAsync(id);
        var dtos = await EnrichAndMapAsync(photos);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Member, "Loose photos", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var photos = await photoRepository.GetLooseByBaulIdAsync(id);
        var dtos = await EnrichAndMapAsync(photos);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoPageDto>> GetPageAsync(Guid baulId, Guid? chapterId, int skip, int take)
    {
        var id = new BaulId(baulId);
        var chapId = chapterId is { } cId ? new ChapterId(cId) : (ChapterId?)null;
        var userId = currentUserProvider.GetUserId();

        if (chapId is { } wantedChapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(wantedChapterId);
            if (chapter is null || chapter.BaulId != id) return Result.Failure<PhotoPageDto>("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            id, userId, AccessLevel.Member, "Photo page", new { BaulId = baulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoPageDto>(auth.Error);

        var clampedTake = Math.Clamp(take, 1, 100);
        var page = (await photoRepository.GetPageAsync(id, chapId, skip, clampedTake + 1)).ToList();
        var hasMore = page.Count > clampedTake;
        var photos = hasMore ? page.Take(clampedTake).ToList() : page;

        var dtos = await EnrichAndMapAsync(photos);

        return Result.Success(new PhotoPageDto(dtos, hasMore));
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
            var dateValidationError = PhotoDate.Validate(explicitDate.Year, explicitDate.Month, explicitDate.Day);
            if (dateValidationError is not null)
            {
                logger.LogWarning("Photo upload rejected: invalid date {Year}/{Month}/{Day}",
                    explicitDate.Year, explicitDate.Month, explicitDate.Day);
                return Result.Failure<PhotoDto>(dateValidationError);
            }
        }

        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null)
        {
            logger.LogWarning("Photo upload rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<PhotoDto>("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photo upload", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, chapter, content, fileName, contentType, date, clientUploadId, userId);
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
            var dateValidationError = PhotoDate.Validate(explicitDate.Year, explicitDate.Month, explicitDate.Day);
            if (dateValidationError is not null)
            {
                logger.LogWarning("Loose photo upload rejected: invalid date {Year}/{Month}/{Day}",
                    explicitDate.Year, explicitDate.Month, explicitDate.Day);
                return Result.Failure<PhotoDto>(dateValidationError);
            }
        }

        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Member, "Loose photo upload", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, null, content, fileName, contentType, date, clientUploadId, userId);
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
        var storageKey = StorageKey.ForPhoto(userId, idGenerator.NewId(), fileName);

        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;
        var photoDate = ResolvePhotoDate(date, buffered);
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

        var photo = Photo.Create(new PhotoId(idGenerator.NewId()), chapterId, baul.Id, storageKey, photoDate, userId, now, clientUploadId);

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
                await chapterRepository.UpdateAsync(chapter.WithPhotoAdded(photo, now));
            }

            await baulRepository.UpdateAsync(baul.WithPhotoAdded(photo, now));
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
        var pId = new PhotoId(photoId);
        var targetId = new ChapterId(targetChapterId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(pId);
        if (photo is null)
        {
            logger.LogWarning("Photo move rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>("Photo not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo move", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var targetChapter = await chapterRepository.GetByIdAsync(targetId);
        if (targetChapter is null || targetChapter.BaulId != photo.BaulId)
        {
            logger.LogWarning(
                "Photo move rejected: target chapter not found {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>("Target chapter not found");
        }

        if (photo.ChapterId == targetId)
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
                await chapterRepository.UpdateAsync(sourceChapter.WithPhotoRemoved(photo, now));
            }
        }

        var updatedPhoto = photo with { ChapterId = targetId };
        await photoRepository.UpdateAsync(updatedPhoto);

        await chapterRepository.UpdateAsync(targetChapter.WithPhotoAdded(photo, now));

        logger.LogInformation(
            "Photo moved {BaulId} {PhotoId} {SourceChapterId} {TargetChapterId}",
            photo.BaulId, photoId, photo.ChapterId, targetChapterId);

        var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
        return ToDto(updatedPhoto, thumbnailUrl, fullUrl);
    }

    public async Task<Result> DeleteAsync(Guid photoId, string? reason)
    {
        var id = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(id);
        if (photo is null)
        {
            logger.LogWarning("Photo delete rejected: photo not found {PhotoId}", photoId);
            return Result.Failure("Photo not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Admin, "Photo delete", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        if (photo.Status == PhotoStatus.Deleted) return Result.Success();

        var now = clock.UtcNow();
        var updatedPhoto = photo with
        {
            Status = PhotoStatus.Deleted,
            DeletedAt = now,
            DeletionReason = reason
        };
        await photoRepository.UpdateAsync(updatedPhoto);

        if (photo.ChapterId is { } chapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(chapterId);
            if (chapter is not null)
            {
                await chapterRepository.UpdateAsync(chapter.WithPhotoRemoved(photo, now));
            }
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is not null && baul.CoverPhotoKey == photo.StorageKey)
        {
            await baulRepository.UpdateAsync(baul.WithPhotoRemoved(photo, now));
        }

        logger.LogInformation("Photo deleted {BaulId} {PhotoId}", photo.BaulId, photoId);
        return Result.Success();
    }

    public async Task<Result<PhotoDto>> ChangeDateAsync(Guid photoId, int year, int? month, int? day)
    {
        if (!PhotoDate.TryCreate(year, month, day, out var newDate, out var validationError))
            return Result.Failure<PhotoDto>(validationError!);

        var id = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(id);
        if (photo is null)
        {
            logger.LogWarning("Photo date change rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>("Photo not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo date change", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithDate(newDate);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo date changed {BaulId} {PhotoId}", photo.BaulId, photoId);

        var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
        return ToDto(updatedPhoto, thumbnailUrl, fullUrl);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<Guid> photoIds, int year, int? month, int? day)
    {
        var validationError = PhotoDate.Validate(year, month, day);
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

    public async Task<Result<PhotoDownloadResult>> DownloadAsync(Guid photoId)
    {
        var id = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(id);
        if (photo is null)
        {
            logger.LogWarning("Photo download rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDownloadResult>("Photo not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo download", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDownloadResult>(auth.Error);

        var content = await photoStorage.OpenReadForDownloadAsync(photo.StorageKey);
        return new PhotoDownloadResult(content.Content, content.ContentType, StorageKey.From(photo.StorageKey).OriginalFileName);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(Guid baulId, Guid personaId)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Member, "Photos by persona", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(pId);
        if (persona is null || persona.BaulId != bId) return Result.Failure<IEnumerable<PhotoDto>>("Persona not found");

        var photoIds = await photoPersonaTagRepository.GetPhotoIdsByPersonaIdAsync(pId);
        var photos = (await photoRepository.GetByIdsAsync(photoIds))
            .Where(p => p.BaulId == bId && p.Status == PhotoStatus.Active)
            .OrderByChronology()
            .ToList();

        var dtos = await EnrichAndMapAsync(photos);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    private async Task<List<PhotoDto>> EnrichAndMapAsync(IEnumerable<Photo> photos)
    {
        var photoList = photos as IReadOnlyCollection<Photo> ?? photos.ToList();
        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photoList.Select(p => p.Id));
        var recuerdoCounts = recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());

        var dtos = new List<PhotoDto>();
        foreach (var photo in photoList)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
            dtos.Add(ToDto(photo, thumbnailUrl, fullUrl, recuerdoCounts.GetValueOrDefault(photo.Id)));
        }

        return dtos;
    }

    private PhotoDate? ResolvePhotoDate((int Year, int? Month, int? Day)? explicitDate, Stream content)
    {
        // Both branches feed already-validated components (explicitDate was checked by the
        // caller; EXIF always yields a full, in-range Y-M-D), so TryCreate can't fail here.
        if (explicitDate is { } d)
            return PhotoDate.TryCreate(d.Year, d.Month, d.Day, out var date, out _) ? date : null;

        var extracted = photoDateExtractor.TryExtractDate(content);
        return extracted is { } e && PhotoDate.TryCreate(e.Year, e.Month, e.Day, out var extractedDate, out _)
            ? extractedDate
            : null;
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
            photo.Date?.Year, photo.Date?.Month, photo.Date?.Day, photo.UploadedBy, photo.CreatedAt, recuerdoCount);
}
