using ElBaul.Domain;
namespace ElBaul.Api.Models;
public record RemovePhotoAssetsBatchRequest(List<PhotoAssetId> AssetIds);
