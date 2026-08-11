using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
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

    public async Task<IEnumerable<Recuerdo>> GetAllAsync() =>
        await dbContext.Recuerdos.AsNoTracking().ToListAsync();

    public async Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync() =>
        await dbContext.Database
            .SqlQueryRaw<RecuerdoBaulIdCandidate>(
                "SELECT \"Id\", \"PhotoId\", \"ChapterId\" FROM \"Recuerdos\" WHERE \"BaulId\" IS NULL")
            .ToListAsync();

    public async Task SetBaulIdAsync(RecuerdoId recuerdoId, BaulId baulId) =>
        await dbContext.Database.ExecuteSqlRawAsync(
            "UPDATE \"Recuerdos\" SET \"BaulId\" = {0} WHERE \"Id\" = {1}",
            baulId.Value, recuerdoId.Value);

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
