using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class PhotoRepository(ElBaulDbContext dbContext) : IPhotoRepository
{
    public Task<Photo?> GetByIdAsync(Guid id) =>
        dbContext.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) =>
        dbContext.Photos.AsNoTracking().FirstOrDefaultAsync(p => p.ClientUploadId == clientUploadId);

    public async Task<IEnumerable<Photo>> GetByAlbumIdAsync(Guid albumId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.AlbumId == albumId && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(Guid baulId) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.AlbumId == null && p.Status == PhotoStatus.Active)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetPreviewPhotosAsync(Guid baulId, int limit) =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public async Task<IEnumerable<Photo>> GetUndatedAsync() =>
        await dbContext.Photos.AsNoTracking()
            .Where(p => p.DateYear == null && p.Status == PhotoStatus.Active)
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

    public async Task DeleteAsync(Guid id)
    {
        await dbContext.Photos.Where(p => p.Id == id).ExecuteDeleteAsync();
    }
}
