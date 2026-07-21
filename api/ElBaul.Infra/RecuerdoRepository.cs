using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class RecuerdoRepository(ElBaulDbContext dbContext) : IRecuerdoRepository
{
    public async Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId == photoId)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && photoIds.Contains(r.PhotoId.Value))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetByAlbumIdAsync(Guid albumId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.AlbumId == albumId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since)
    {
        var photoIdsInBaul = dbContext.Photos
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .Select(p => p.Id);
        var albumIdsInBaul = dbContext.Albums.Where(a => a.BaulId == baulId).Select(a => a.Id);

        return await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.CreatedAt >= since &&
                ((r.PhotoId != null && photoIdsInBaul.Contains(r.PhotoId.Value)) ||
                 (r.PhotoId == null && r.AlbumId != null && albumIdsInBaul.Contains(r.AlbumId.Value))))
            .ToListAsync();
    }

    public async Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync() =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && r.AlbumId == null)
            .ToListAsync();

    public async Task CreateAsync(Recuerdo recuerdo)
    {
        dbContext.Recuerdos.Add(recuerdo);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Recuerdo recuerdo)
    {
        dbContext.Recuerdos.Update(recuerdo);
        await dbContext.SaveChangesAsync();
    }
}
