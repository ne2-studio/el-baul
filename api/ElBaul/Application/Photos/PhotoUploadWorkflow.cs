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
    public async Task<Photo> CreatePhotoAsync(
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
        StoredPhotoFile storedFile;
        try
        {
            storedFile = await photoFileService.SaveForUploadAsync(userId, fileName, contentType, content, explicitDate);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {ChapterId} {FileName} {ContentType}",
                baulId, chapterId, fileName, contentType);
            throw;
        }

        var now = clock.UtcNow();
        var photo = Photo.Create(
            new PhotoId(idGenerator.NewId()), chapterId, baulId, storedFile.StorageKey, storedFile.Date, userId, now,
            clientUploadId, storedFile.SizeBytes, uploadBatchId);

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

        return photo;
    }
}
