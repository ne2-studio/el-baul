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
//
// "Sin compartir" (Slice 3, docs/.backlog issue #62) deliberately answers "has THIS user
// distributed THIS asset to a baúl THEY can access", never a global
// PhotoAsset.Photos.Any() — that would leak another user's completely unrelated use of the
// same canonical PhotoAsset (see PhotoAsset's doc comment on cross-user sharing) into this
// user's personal organization state. accessibleBaulNames already scopes every appearance
// query below to baúles the caller may know about, which happens to be exactly the right
// scope for both "Todas"'s "Aparece en" list (existing Slice 1 behaviour) and "Sin
// compartir"'s emptiness check — no model change was needed to make this user-relative.
public class MyPhotosReadManager(
    IPhotoRepository photoRepository,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoStorage photoStorage) : IMyPhotosReadManager
{
    public async Task<Result<PhotoAssetPageDto>> GetMyPhotosAsync(int skip, int take, bool unsharedOnly = false)
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

        if (unsharedOnly)
        {
            // Computed over every one of the user's assets up front (not just the page being
            // returned) — narrowing to "Sin compartir" has to happen before paging, or a page
            // could come back with fewer than `take` items despite more unshared ones existing
            // further down the unfiltered order.
            var sharedAssetIds = (await photoRepository.GetActiveByAssetIdsAsync(orderedIds))
                .Where(p => accessibleBaulNames.ContainsKey(p.BaulId))
                .Select(p => p.PhotoAssetId)
                .ToHashSet();
            orderedIds = orderedIds.Where(id => !sharedAssetIds.Contains(id)).ToList();
        }

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

    // Single-asset counterpart to the per-page assembly above — a little duplication of the
    // appearances/URL logic, traded for not paying a batched accessibleBaulNames/appearances
    // query shaped for a whole page just to project the one asset PhotoManager.UploadToMyPhotosAsync
    // just ingested (Slice 3, docs/.backlog issue #62).
    public async Task<PhotoAssetDto> ProjectAsync(PhotoAsset asset, UserId userId)
    {
        var accessibleBaulNames = (await baulAccess.GetAccessibleAsync(userId))
            .ToDictionary(a => a.Baul.Id, a => a.Baul.Name);

        // Same "originating Photo shares the asset's Guid" trick GetMyPhotosAsync uses to
        // recover the asset's intrinsic date — absent for an asset ingested directly here with
        // no Photo ever created for it, which just leaves it undated (see PhotoUploadWorkflow.
        // IngestAssetAsync's doc comment on why the EXIF date has nowhere else to live yet).
        var originatingPhoto = await photoRepository.GetByIdAsync(new PhotoId(asset.Id.Value));

        var appearances = (await photoRepository.GetActiveByAssetIdsAsync([asset.Id]))
            .Where(p => accessibleBaulNames.ContainsKey(p.BaulId))
            .Select(p => p.BaulId).Distinct()
            .Select(baulId => new BaulAppearanceDto(baulId.ToString(), accessibleBaulNames[baulId]))
            .ToList();

        var thumbnailUrl = await photoStorage.GetImageUrl(asset.StorageKey, ImagePlacement.PhotoGridThumbnail);
        var fullUrl = await photoStorage.GetImageUrl(asset.StorageKey, ImagePlacement.PhotoFull);

        return new PhotoAssetDto(
            asset.Id.ToString(), thumbnailUrl, fullUrl,
            originatingPhoto?.TakenAt?.Year, originatingPhoto?.TakenAt?.Month, originatingPhoto?.TakenAt?.Day,
            asset.Dimensions.Width, asset.Dimensions.Height, asset.CreatedAt, appearances);
    }
}
