using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record ChangePhotoDateBatchRequest(List<PhotoId> PhotoIds, int Year, int? Month, int? Day);
