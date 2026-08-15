using ElBaul.OutputPorts.Photos;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class PhotoRepository(ElBaulDbContext dbContext) : IPhotoRepository
{
    public Task<Photo?> GetByIdAsync(PhotoId id) =>
        dbContext.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids) =>
        await dbContext.Photos.AsNoTracking().Where(p => ids.Contains(p.Id)).ToListAsync();

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) =>
        dbContext.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.ClientUploadId == clientUploadId);

    public async Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId) =>
        await dbContext.Photos.AsNoTracking().Where(p => p.ChapterId == chapterId).ToListAsync();

    public async Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since
                && p.UploadedBy != excludingUserId)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && (chapterId == null || p.ChapterId == chapterId))
            .OrderByChronology()
            .Skip(skip)
            .Take(take)
            .ToListAsync();

    // Queries the raw DateYear column, not the computed Photo.Date — Date isn't part of the EF
    // model (see PhotoConfiguration's Ignore), so it can't be translated into SQL.
    public async Task<IEnumerable<Photo>> GetUndatedAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.DateYear == null && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetMissingSizeBytesAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.SizeBytes == 0)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetMissingDimensionsAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.Width == 0)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetOversizedAsync(int maxLongEdge) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.Width > maxLongEdge || p.Height > maxLongEdge)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.UploadBatchId == null && p.Status == PhotoStatus.Active)
            .OrderBy(p => p.BaulId).ThenBy(p => p.ChapterId).ThenBy(p => p.UploadedBy).ThenBy(p => p.CreatedAt)
            .ToListAsync();

    public Task<Photo?> GetActiveByContentHashAsync(BaulId baulId, string originalContentHash) =>
        dbContext.Photos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.BaulId == baulId && p.OriginalContentHash == originalContentHash && p.Status == PhotoStatus.Active);

    public async Task<IEnumerable<Photo>> GetMissingContentHashAsync() =>
        await dbContext.Photos.AsNoTracking().Where(p => p.OriginalContentHash == null).ToListAsync();

    public async Task<IEnumerable<Photo>> GetActiveWithContentHashAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.Status == PhotoStatus.Active && p.OriginalContentHash != null)
            .ToListAsync();

    public async Task CreateAsync(Photo photo)
    {
        dbContext.Photos.Add(photo);
        await dbContext.SaveChangesAsync();
    }

    // Native INSERT ... ON CONFLICT DO NOTHING rather than Add + catch(DbUpdateException) — same
    // rationale as SentEmailRepository.TryReserveAsync/BaulInviteLinkRepository.CreateAsync (see
    // IUnitOfWork's doc comment): a caught exception still poisons the ambient transaction
    // PhotoUploadWorkflow runs this inside, so the conflict has to be absorbed by Postgres itself
    // instead of surfacing as a .NET exception at all.
    public async Task<bool> TryCreateActiveAsync(Photo photo)
    {
        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "Photos" ("Id", "BaulId", "ChapterId", "StorageKey", "DateYear", "DateMonth", "DateDay", "UploadedBy", "CreatedAt", "ClientUploadId", "Status", "DeletedAt", "DeletionReason", "SizeBytes", "UploadBatchId", "ConfirmedNoPersonas", "Width", "Height", "OriginalWidth", "OriginalHeight", "OriginalSizeBytes", "OriginalContentHash")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11}, {12}, {13}, {14}, {15}, {16}, {17}, {18}, {19}, {20}, {21})
            ON CONFLICT ("BaulId", "OriginalContentHash") WHERE "Status" = 'Active' AND "OriginalContentHash" IS NOT NULL DO NOTHING
            """,
            photo.Id.Value, photo.BaulId.Value, photo.ChapterId?.Value!, photo.StorageKey,
            photo.DateYear!, photo.DateMonth!, photo.DateDay!, photo.UploadedBy.Value, photo.CreatedAt,
            photo.ClientUploadId!, photo.Status.ToString(), photo.DeletedAt!, photo.DeletionReason!,
            photo.SizeBytes, photo.UploadBatchId!, photo.ConfirmedNoPersonas, photo.Width, photo.Height,
            photo.OriginalWidth!, photo.OriginalHeight!, photo.OriginalSizeBytes!, photo.OriginalContentHash!);

        return inserted == 1;
    }

    // Guards the same uniqueness as TryCreateActiveAsync's ON CONFLICT clause, but for an
    // UPDATE (no ON CONFLICT equivalent exists there) — the WHERE makes the whole statement
    // atomic, so this is race-safe against another concurrent call reaching the same check even
    // before IX_Photos_BaulId_OriginalContentHash_Active exists; the index is the final backstop
    // once it does. Only Active targets are guarded: a Deleted photo can carry any hash value
    // without ever tripping the (Active-only) constraint, so backfilling one never needs to check.
    public async Task<bool> TrySetContentHashAsync(PhotoId photoId, BaulId baulId, string originalContentHash)
    {
        var updated = await dbContext.Database.ExecuteSqlRawAsync(
            """
            UPDATE "Photos" SET "OriginalContentHash" = {0}
            WHERE "Id" = {1}
              AND ("Status" <> 'Active' OR NOT EXISTS (
                  SELECT 1 FROM "Photos" other
                  WHERE other."BaulId" = {2} AND other."OriginalContentHash" = {0}
                    AND other."Status" = 'Active' AND other."Id" <> {1}
              ))
            """,
            originalContentHash, photoId.Value, baulId.Value);

        return updated == 1;
    }

    public async Task UpdateAsync(Photo photo)
    {
        dbContext.Photos.Update(photo);
        await dbContext.SaveChangesAsync();
    }

    public async Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking().Where(p => p.BaulId == baulId).ToListAsync();

    public async Task DeleteAsync(PhotoId id)
    {
        await dbContext.Photos.Where(p => p.Id == id).ExecuteDeleteAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.Photos.Where(p => p.BaulId == baulId).ExecuteDeleteAsync();
    }
}
