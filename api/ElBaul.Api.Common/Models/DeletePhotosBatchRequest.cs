using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record DeletePhotosBatchRequest(List<PhotoId> PhotoIds, string? Reason);
