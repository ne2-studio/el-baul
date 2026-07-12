using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class AlbumRepository(ElBaulDbContext dbContext) : IAlbumRepository
{
    public Task<Album?> GetByIdAsync(Guid id) =>
        dbContext.Albums.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IEnumerable<Album>> GetByBaulIdAsync(Guid baulId) =>
        await dbContext.Albums.AsNoTracking().Where(a => a.BaulId == baulId).ToListAsync();

    public async Task CreateAsync(Album album)
    {
        dbContext.Albums.Add(album);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Album album)
    {
        dbContext.Albums.Update(album);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        await dbContext.Albums.Where(a => a.Id == id).ExecuteDeleteAsync();
    }
}
