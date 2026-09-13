using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class PhotoRepository(ElBaulDbContext dbContext) : IPhotoRepository
{
    public Task<Photo?> GetByIdAsync(PhotoId id) =>
        dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset).Where(p => ids.Contains(p.Id)).ToListAsync();

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) =>
        dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset).FirstOrDefaultAsync(p => p.ClientUploadId == clientUploadId);

    public async Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset).Where(p => p.ChapterId == chapterId).ToListAsync();

    public async Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since
                && p.UploadedBy != excludingUserId)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && (chapterId == null || p.ChapterId == chapterId))
            .OrderByChronology()
            .Skip(skip)
            .Take(take)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetActiveWithContentHashAsync() =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .Where(p => p.Status == PhotoStatus.Active && p.OriginalContentHash != null)
            .ToListAsync();

    public Task<Photo?> GetActiveByAssetIdAsync(BaulId baulId, PhotoAssetId assetId) =>
        dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .FirstOrDefaultAsync(p => p.BaulId == baulId && p.PhotoAssetId == assetId && p.Status == PhotoStatus.Active);

    public async Task CreateAsync(Photo photo)
    {
        dbContext.Photos.Add(photo);
        await dbContext.SaveChangesAsync();
    }

    // Mirrors TryCreateAssetAsync's ON CONFLICT DO NOTHING shape but never touches PhotoAssets — the asset behind
    // `photo` already exists (it's the source photo's own asset; see
    // PhotoManager.AddToBaulAsync/Photo.CreateFromExistingAsset), so this only ever inserts the new
    // Photos row. Attach it Unchanged first so EF doesn't try to (re)insert it as a side effect
    // of the Photo insert below.
    public async Task<bool> TryAddExistingAssetAsync(Photo photo)
    {
        dbContext.Attach(photo.PhotoAsset).State = EntityState.Unchanged;

        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "Photos" ("Id", "BaulId", "ChapterId", "PhotoAssetId", "DateYear", "DateMonth", "DateDay", "UploadedBy", "CreatedAt", "ClientUploadId", "Status", "DeletedAt", "DeletionReason", "UploadBatchId", "ConfirmedNoPersonas", "OriginalContentHash")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11}, {12}, {13}, {14}, {15})
            ON CONFLICT ("BaulId", "PhotoAssetId") WHERE "Status" = 'Active' DO NOTHING
            """,
            photo.Id.Value, photo.BaulId.Value, photo.ChapterId?.Value!, photo.PhotoAssetId.Value,
            photo.TakenAt?.Year, photo.TakenAt?.Month, photo.TakenAt?.Day, photo.UploadedBy.Value, photo.CreatedAt,
            photo.ClientUploadId!, photo.Status.ToString(), photo.DeletedAt!, photo.DeletionReason!,
            photo.UploadBatchId!, photo.ConfirmedNoPersonas, photo.OriginalContentHash!);

        return inserted == 1;
    }

    public async Task UpdateAsync(Photo photo)
    {
        dbContext.Photos.Update(photo);
        await dbContext.SaveChangesAsync();
    }

    public async Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset).Where(p => p.BaulId == baulId).ToListAsync();

    // Slice 2 (docs/.backlog issue #62) made PhotoAsset sharable across Photos in different
    // baúles ("Add to another baúl"), so a Photo's own asset can no longer be assumed exclusively
    // theirs — deleting it here as a side effect of deleting this Photo could silently break
    // another baúl's Photo still pointing at it. PhotoAsset lifetime is deliberately decoupled
    // from Photo lifetime from this slice onward: deleting the last Photo referencing an asset
    // leaves it orphaned on purpose. Slice 3 is expected to add garbage collection for those.
    public async Task DeleteAsync(PhotoId id) =>
        await dbContext.Photos.Where(p => p.Id == id).ExecuteDeleteAsync();

    public async Task DeleteByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.Where(p => p.BaulId == baulId).ExecuteDeleteAsync();

    public async Task<IReadOnlyList<PhotoAsset>> GetByContributorAsync(UserId userId) =>
        await dbContext.UserPhotoAssets.AsNoTracking()
            .Where(r => r.UserId == userId)
            .Join(dbContext.PhotoAssets.AsNoTracking(), r => r.PhotoAssetId, a => a.Id, (r, a) => a)
            .ToListAsync();

    public async Task<IReadOnlyList<Photo>> GetActiveByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => assetIds.Contains(p.PhotoAssetId) && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<PhotoAsset?> GetAssetByIdAsync(PhotoAssetId id) =>
        await dbContext.PhotoAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

    public async Task<PhotoAsset?> GetAssetByContentHashAsync(string originalContentHash) =>
        await dbContext.PhotoAssets.AsNoTracking().FirstOrDefaultAsync(a => a.OriginalContentHash == originalContentHash);

    // Native INSERT ... ON CONFLICT DO NOTHING — same rationale as TryCreateActiveAsync below:
    // the caller (PhotoUploadWorkflow) runs this ahead of/inside its own transaction, so a
    // caught DbUpdateException would poison it the same way.
    public async Task<bool> TryCreateAssetAsync(PhotoAsset asset)
    {
        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "PhotoAssets" ("Id", "StorageKey", "SizeBytes", "Width", "Height", "OriginalWidth", "OriginalHeight", "OriginalSizeBytes", "OriginalContentHash", "CreatedAt", "UploadedBy")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10})
            ON CONFLICT ("OriginalContentHash") WHERE "OriginalContentHash" IS NOT NULL DO NOTHING
            """,
            asset.Id.Value, asset.StorageKey, asset.SizeBytes,
            asset.Dimensions.Width, asset.Dimensions.Height,
            asset.OriginalDimensions?.Width, asset.OriginalDimensions?.Height,
            asset.OriginalSizeBytes!, asset.OriginalContentHash!, asset.CreatedAt, asset.UploadedBy.Value);

        if (inserted == 1)
        {
            dbContext.Attach(asset).State = EntityState.Unchanged;
        }

        return inserted == 1;
    }

    public async Task<bool> HasUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId) =>
        await dbContext.UserPhotoAssets.AsNoTracking().AnyAsync(r => r.UserId == userId && r.PhotoAssetId == assetId);

    // Native INSERT ... ON CONFLICT DO NOTHING against IX_UserPhotoAssets_UserId_PhotoAssetId —
    // same rationale as TryCreateActiveAsync: this always runs inside the caller's ambient
    // transaction (upload, add-to-baúl), where a caught DbUpdateException would poison it.
    public async Task<bool> TryCreateUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId, DateTime addedAt)
    {
        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "UserPhotoAssets" ("UserId", "PhotoAssetId", "AddedAt")
            VALUES ({0}, {1}, {2})
            ON CONFLICT ("UserId", "PhotoAssetId") DO NOTHING
            """,
            userId.Value, assetId.Value, addedAt);

        return inserted == 1;
    }

    // Anti-joins against both Photos and UserPhotoAssets — a PhotoAsset referenced by either
    // is not orphaned (see PhotoAsset's/UserPhotoAssetConfiguration's doc comments on why
    // neither FK cascades into it). CreatedAt-scoped so an asset mid-upload (already inserted,
    // its Photo/UserPhotoAsset row not committed yet) is never picked up mid-race.
    public async Task<IReadOnlyList<PhotoAsset>> GetOrphanedAssetsAsync(DateTime olderThan) =>
        await dbContext.PhotoAssets.AsNoTracking()
            .Where(a => a.CreatedAt < olderThan)
            .Where(a => !dbContext.Photos.Any(p => p.PhotoAssetId == a.Id))
            .Where(a => !dbContext.UserPhotoAssets.Any(r => r.PhotoAssetId == a.Id))
            .ToListAsync();

    public async Task DeleteAssetAsync(PhotoAssetId id) =>
        await dbContext.PhotoAssets.Where(a => a.Id == id).ExecuteDeleteAsync();
}
