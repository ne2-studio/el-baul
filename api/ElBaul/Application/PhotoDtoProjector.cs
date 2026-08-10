using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Application;

public class PhotoDtoProjector(
    IPhotoStorage photoStorage,
    IRecuerdoRepository recuerdoRepository) : IPhotoDtoProjector
{
    public async Task<PhotoDto> ProjectAsync(Photo photo)
    {
        var dtos = await ProjectAsync([photo]);
        return dtos.Single();
    }

    public async Task<List<PhotoDto>> ProjectAsync(IEnumerable<Photo> photos)
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

    public async Task<List<PhotoDto>> ProjectAsync(IEnumerable<PhotoListRow> rows)
    {
        var dtos = new List<PhotoDto>();
        foreach (var row in rows)
        {
            var thumbnailUrl = await photoStorage.GetImageUrl(row.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(row.StorageKey, ImagePlacement.PhotoFull);
            dtos.Add(new PhotoDto(row.Id.ToString(), row.ChapterId?.ToString(), row.BaulId.ToString(), thumbnailUrl, fullUrl,
                row.DateYear, row.DateMonth, row.DateDay, row.UploadedBy, row.CreatedAt, row.RecuerdoCount));
        }

        return dtos;
    }

    private static PhotoDto ToDto(Photo photo, string thumbnailUrl, string fullUrl, int recuerdoCount) =>
        new(photo.Id.ToString(), photo.ChapterId?.ToString(), photo.BaulId.ToString(), thumbnailUrl, fullUrl,
            photo.Date?.Year, photo.Date?.Month, photo.Date?.Day, photo.UploadedBy, photo.CreatedAt, recuerdoCount);
}
