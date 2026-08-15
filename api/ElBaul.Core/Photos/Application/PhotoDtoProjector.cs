using ElBaul.Core.Photos;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;
public class PhotoDtoProjector(
    IPhotoStorage photoStorage,
    IRecuerdoRepository recuerdoRepository,
    IClock clock) : IPhotoDtoProjector
{
    public async Task<PhotoDto> ProjectAsync(Photo photo, bool isAdmin, UserId currentUserId, bool alreadyExisted = false)
    {
        var dtos = await ProjectAsync([photo], isAdmin, currentUserId);
        var dto = dtos.Single();
        return alreadyExisted ? dto with { AlreadyExisted = true } : dto;
    }

    public async Task<List<PhotoDto>> ProjectAsync(IEnumerable<Photo> photos, bool isAdmin, UserId currentUserId)
    {
        var photoList = photos as IReadOnlyCollection<Photo> ?? photos.ToList();
        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photoList.Select(p => p.Id));
        var recuerdoCounts = recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());
        var now = clock.UtcNow();

        var dtos = new List<PhotoDto>();
        foreach (var photo in photoList)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
            dtos.Add(ToDto(photo, thumbnailUrl, fullUrl, recuerdoCounts.GetValueOrDefault(photo.Id), isAdmin, currentUserId, now));
        }

        return dtos;
    }

    public async Task<List<PhotoDto>> ProjectAsync(IEnumerable<PhotoListRow> rows, bool isAdmin, UserId currentUserId)
    {
        var now = clock.UtcNow();
        var dtos = new List<PhotoDto>();
        foreach (var row in rows)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(row.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(row.StorageKey, ImagePlacement.PhotoFull);
            var canDelete = PhotoDeletePolicy.CanDelete(row.UploadedBy, row.CreatedAt, currentUserId, isAdmin, now);
            dtos.Add(new PhotoDto(row.Id.ToString(), row.ChapterId?.ToString(), row.BaulId.ToString(), thumbnailUrl, fullUrl,
                row.DateYear, row.DateMonth, row.DateDay, row.UploadedBy, row.CreatedAt, row.RecuerdoCount, canDelete, !canDelete));
        }

        return dtos;
    }

    private static PhotoDto ToDto(
        Photo photo, string thumbnailUrl, string fullUrl, int recuerdoCount, bool isAdmin, UserId currentUserId, DateTime now)
    {
        var canDelete = PhotoDeletePolicy.CanDelete(photo, currentUserId, isAdmin, now);
        return new(photo.Id.ToString(), photo.ChapterId?.ToString(), photo.BaulId.ToString(), thumbnailUrl, fullUrl,
            photo.Date?.Year, photo.Date?.Month, photo.Date?.Day, photo.UploadedBy, photo.CreatedAt, recuerdoCount, canDelete, !canDelete);
    }
}
