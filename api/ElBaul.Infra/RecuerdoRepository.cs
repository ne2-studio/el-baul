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
            .Where(r => photoIds.Contains(r.PhotoId))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task CreateAsync(Recuerdo recuerdo)
    {
        dbContext.Recuerdos.Add(recuerdo);
        await dbContext.SaveChangesAsync();
    }
}
