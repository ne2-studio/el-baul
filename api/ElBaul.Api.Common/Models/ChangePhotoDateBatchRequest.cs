namespace ElBaul.Api.Models;

public record ChangePhotoDateBatchRequest(List<string> PhotoIds, int Year, int? Month, int? Day);
