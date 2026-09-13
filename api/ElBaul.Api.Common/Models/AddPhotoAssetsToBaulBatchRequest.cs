using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record AddPhotoAssetsToBaulBatchRequest(List<PhotoAssetId> AssetIds, BaulId TargetBaulId);
