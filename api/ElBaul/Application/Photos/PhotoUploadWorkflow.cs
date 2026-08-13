using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Application.Photos;

public class PhotoUploadWorkflow(
    ILogger<PhotoUploadWorkflow> logger,
    IPhotoRepository photoRepository,
    PhotoFileService photoFileService,
    IIdGenerator idGenerator,
    IClock clock,
    IUnitOfWork unitOfWork)
{
    public async Task<Result<Photo>> CreatePhotoAsync(
        BaulId baulId,
        ChapterId? chapterId,
        UserId userId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? explicitDate,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId,
        Func<Photo, DateTime, Task> persistRelatedStateAsync)
    {
        Result<StoredPhotoFile> storedFileResult;
        try
        {
            storedFileResult = await photoFileService.SaveForUploadAsync(userId, fileName, contentType, content, explicitDate);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {ChapterId} {FileName} {ContentType}",
                baulId, chapterId, fileName, contentType);
            throw;
        }

        // Rejected by ImagePolicy (oversized file, resolution over the hard limit, or not a
        // valid image) — an expected validation outcome, not a storage/infra failure, so it
        // never touched storage and there's nothing to compensate for.
        if (storedFileResult.IsFailure) return Result.Failure<Photo>(storedFileResult.Error);
        var storedFile = storedFileResult.Value;

        var now = clock.UtcNow();
        var photo = Photo.Create(
            new PhotoId(idGenerator.NewId()), chapterId, baulId, storedFile.StorageKey, storedFile.Date, userId, now,
            clientUploadId, storedFile.SizeBytes, uploadBatchId, storedFile.Width, storedFile.Height,
            storedFile.OriginalWidth, storedFile.OriginalHeight, storedFile.OriginalSizeBytes);

        try
        {
            // The photo row and its related aggregate bookkeeping commit together; if metadata
            // persistence fails after the storage object is already saved, compensate below.
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await photoRepository.CreateAsync(photo);
                await persistRelatedStateAsync(photo, now);
                return Result.Success();
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while persisting photo metadata {BaulId} {ChapterId} {PhotoId} {StorageKey}",
                baulId, chapterId, photo.Id, storedFile.StorageKey);
            await photoFileService.TryDeleteOrphanedStorageObjectAsync(storedFile.StorageKey);
            throw;
        }

        return Result.Success(photo);
    }
}
