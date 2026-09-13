using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

// The read path behind the user-scoped "Mis fotos" screen (docs/.backlog issue #62,
// multi-vault groundwork) — a projection over PhotoAsset, not Photo: the same asset shared
// into several baúles (see Photo.CreateFromExistingAsset) must appear exactly once here.
// Depends on the concrete BaulAccessService (not IBaulAuthorizer) for GetAccessibleAsync,
// the same way BaulManager/WelcomeEmailManager do — there is no single BaulId to authorize
// against, only "every baúl this user may know about".
public class MyPhotosReadManager(
    IPhotoRepository photoRepository,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoStorage photoStorage) : IMyPhotosReadManager
{
    public async Task<Result<PhotoAssetPageDto>> GetMyPhotosAsync(int skip, int take)
    {
        var userId = currentUserProvider.GetUserId();
        var clampedTake = Math.Clamp(take, 1, 100);

        var accessibleBaulNames = (await baulAccess.GetAccessibleAsync(userId))
            .ToDictionary(a => a.Baul.Id, a => a.Baul.Name);

        var assets = await photoRepository.GetByContributorAsync(userId);
        if (assets.Count == 0) return Result.Success(new PhotoAssetPageDto([], false));

        var assetIds = assets.Select(a => a.Id).ToList();

        // Each asset's own originating Photo (same Guid — see Photo.Create) gives us the
        // asset's intrinsic date; PhotoOrdering.OrderByChronology is the same rule every other
        // photo listing in the app already agrees on.
        var originatingPhotosById = (await photoRepository.GetByIdsAsync(assetIds.Select(id => new PhotoId(id.Value))))
            .ToDictionary(p => new PhotoAssetId(p.Id.Value));

        var orderedAssetIds = originatingPhotosById.Values
            .OrderByChronology()
            .Select(p => new PhotoAssetId(p.Id.Value))
            .ToList();
        // Only possible if every Photo that ever referenced this asset was hard-deleted (the
        // admin baúl-deletion path — see PhotoRepository.DeleteAsync's comment) while the asset
        // itself lived on as an intentional orphan; put those last, oldest-created first.
        var assetsMissingAnOriginatingPhoto = assetIds.Except(orderedAssetIds).ToList();
        var orderedIds = orderedAssetIds
            .Concat(assets.Where(a => assetsMissingAnOriginatingPhoto.Contains(a.Id))
                .OrderBy(a => a.CreatedAt)
                .Select(a => a.Id))
            .ToList();

        var hasMore = skip + clampedTake < orderedIds.Count;
        var pageIds = orderedIds.Skip(skip).Take(clampedTake).ToList();
        if (pageIds.Count == 0) return Result.Success(new PhotoAssetPageDto([], false));

        // Baúl appearances for exactly the page being returned — batched in one query rather
        // than one per asset, and filtered to accessibleBaulNames before ever building a DTO:
        // a baúl the caller can't access must never surface its id/name here.
        var appearancesByAsset = (await photoRepository.GetActiveByAssetIdsAsync(pageIds))
            .Where(p => accessibleBaulNames.ContainsKey(p.BaulId))
            .GroupBy(p => p.PhotoAssetId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(p => p.BaulId).Distinct()
                    .Select(baulId => new BaulAppearanceDto(baulId.ToString(), accessibleBaulNames[baulId]))
                    .ToList());

        var assetsById = assets.ToDictionary(a => a.Id);
        var dtos = new List<PhotoAssetDto>();
        foreach (var id in pageIds)
        {
            var asset = assetsById[id];
            var originatingPhoto = originatingPhotosById.GetValueOrDefault(id);
            var thumbnailUrl = await photoStorage.GetImageUrl(asset.StorageKey, ImagePlacement.PhotoGridThumbnail);
            var fullUrl = await photoStorage.GetImageUrl(asset.StorageKey, ImagePlacement.PhotoFull);

            dtos.Add(new PhotoAssetDto(
                asset.Id.ToString(), thumbnailUrl, fullUrl,
                originatingPhoto?.TakenAt?.Year, originatingPhoto?.TakenAt?.Month, originatingPhoto?.TakenAt?.Day,
                asset.Dimensions.Width, asset.Dimensions.Height, asset.CreatedAt,
                appearancesByAsset.GetValueOrDefault(id, [])));
        }

        return Result.Success(new PhotoAssetPageDto(dtos, hasMore));
    }
}
