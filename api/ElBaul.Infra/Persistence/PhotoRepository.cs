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

    public Task<Photo?> GetActiveByContentHashAsync(BaulId baulId, string originalContentHash) =>
        dbContext.Photos.AsNoTracking().Include(p => p.PhotoAsset)
            .FirstOrDefaultAsync(p => p.BaulId == baulId && p.OriginalContentHash == originalContentHash && p.Status == PhotoStatus.Active);

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

    // Native INSERT ... ON CONFLICT DO NOTHING rather than Add + catch(DbUpdateException) — same
    // rationale as SentEmailRepository.TryReserveAsync (see
    // IUnitOfWork's doc comment): a caught exception still poisons the ambient transaction
    // PhotoUploadWorkflow runs this inside, so the conflict has to be absorbed by Postgres itself
    // instead of surfacing as a .NET exception at all.
    public async Task<bool> TryCreateActiveAsync(Photo photo)
    {
        // The stored file behind this upload attempt always gets its own PhotoAsset row,
        // regardless of whether this Photo goes on to win the (BaulId, OriginalContentHash) race
        // below — a losing Photo still becomes a real, soft-deleted row via
        // PhotoUploadWorkflow.RecordDuplicateAsync, keeping its own storage key. Written as its
        // own plain insert (not the ON CONFLICT one below, and not via dbContext.PhotoAssets.Add)
        // so it participates in whatever ambient transaction the caller already opened, the same
        // way the Photos insert below does.
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "PhotoAssets" ("Id", "StorageKey", "SizeBytes", "Width", "Height", "OriginalWidth", "OriginalHeight", "OriginalSizeBytes", "OriginalContentHash", "CreatedAt")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9})
            """,
            photo.PhotoAsset.Id.Value, photo.PhotoAsset.StorageKey, photo.PhotoAsset.SizeBytes,
            photo.PhotoAsset.Dimensions.Width, photo.PhotoAsset.Dimensions.Height,
            photo.PhotoAsset.OriginalDimensions?.Width, photo.PhotoAsset.OriginalDimensions?.Height,
            photo.PhotoAsset.OriginalSizeBytes!, photo.PhotoAsset.OriginalContentHash!, photo.PhotoAsset.CreatedAt);

        // The PhotoAsset above just got persisted outside EF's change tracker — attach it as
        // Unchanged so that if this Photo loses the race below and later goes through a normal
        // EF Add (RecordDuplicateAsync -> CreateAsync), EF doesn't try to INSERT this same
        // PhotoAsset a second time.
        dbContext.Attach(photo.PhotoAsset).State = EntityState.Unchanged;

        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "Photos" ("Id", "BaulId", "ChapterId", "PhotoAssetId", "DateYear", "DateMonth", "DateDay", "UploadedBy", "CreatedAt", "ClientUploadId", "Status", "DeletedAt", "DeletionReason", "UploadBatchId", "ConfirmedNoPersonas", "OriginalContentHash")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11}, {12}, {13}, {14}, {15})
            ON CONFLICT ("BaulId", "OriginalContentHash") WHERE "Status" = 'Active' AND "OriginalContentHash" IS NOT NULL DO NOTHING
            """,
            photo.Id.Value, photo.BaulId.Value, photo.ChapterId?.Value!, photo.PhotoAssetId.Value,
            photo.TakenAt?.Year, photo.TakenAt?.Month, photo.TakenAt?.Day, photo.UploadedBy.Value, photo.CreatedAt,
            photo.ClientUploadId!, photo.Status.ToString(), photo.DeletedAt!, photo.DeletionReason!,
            photo.UploadBatchId!, photo.ConfirmedNoPersonas, photo.OriginalContentHash!);

        return inserted == 1;
    }

    // Mirrors TryCreateActiveAsync above but never touches PhotoAssets — the asset behind
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
}
