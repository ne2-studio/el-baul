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

    public async Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(Guid baulId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.BaulId == baulId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.BaulId == baulId && r.CreatedAt >= since)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync() =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && r.AlbumId == null)
            .ToListAsync();

    public async Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync() =>
        await dbContext.Database
            .SqlQueryRaw<RecuerdoBaulIdCandidate>(
                "SELECT \"Id\", \"PhotoId\", \"AlbumId\" FROM \"Recuerdos\" WHERE \"BaulId\" IS NULL")
            .ToListAsync();

    public async Task SetBaulIdAsync(Guid recuerdoId, Guid baulId) =>
        await dbContext.Database.ExecuteSqlRawAsync(
            "UPDATE \"Recuerdos\" SET \"BaulId\" = {0} WHERE \"Id\" = {1}",
            baulId, recuerdoId);

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
