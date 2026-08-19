using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Recuerdos.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class RecuerdoRepository(ElBaulDbContext dbContext) : IRecuerdoRepository
{
    public Task<Recuerdo?> GetByIdAsync(RecuerdoId recuerdoId) =>
        dbContext.Recuerdos.AsNoTracking().FirstOrDefaultAsync(r => r.Id == recuerdoId);

    public async Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId == photoId)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && photoIds.Contains(r.PhotoId.Value))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.ChapterId == chapterId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.BaulId == baulId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) =>
        await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.BaulId == baulId && r.CreatedAt >= since && r.UserId != excludingUserId)
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

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.Recuerdos.Where(r => r.BaulId == baulId).ExecuteDeleteAsync();
    }
}
