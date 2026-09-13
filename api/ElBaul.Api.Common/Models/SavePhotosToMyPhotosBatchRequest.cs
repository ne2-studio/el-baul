using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record SavePhotosToMyPhotosBatchRequest(List<PhotoId> PhotoIds);
