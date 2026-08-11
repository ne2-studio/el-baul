using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
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

    public async Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, string excludingUserId) =>
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

    public async Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.UploadBatchId == null && p.Status == PhotoStatus.Active)
            .OrderBy(p => p.BaulId).ThenBy(p => p.ChapterId).ThenBy(p => p.UploadedBy).ThenBy(p => p.CreatedAt)
            .ToListAsync();

    public async Task CreateAsync(Photo photo)
    {
        dbContext.Photos.Add(photo);
        await dbContext.SaveChangesAsync();
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
