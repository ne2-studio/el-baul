using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record ClearPhotoDateBatchRequest(List<PhotoId> PhotoIds);
