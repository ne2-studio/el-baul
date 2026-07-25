using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class PhotoPersonaTagRepository(ElBaulDbContext dbContext) : IPhotoPersonaTagRepository
{
    public async Task<IEnumerable<PersonaId>> GetPersonaIdsByPhotoIdAsync(PhotoId photoId) =>
        await dbContext.PhotoPersonaTags.AsNoTracking()
            .Where(t => t.PhotoId == photoId)
            .Select(t => t.PersonaId)
            .ToListAsync();

    public async Task<IEnumerable<PhotoId>> GetPhotoIdsByPersonaIdAsync(PersonaId personaId) =>
        await dbContext.PhotoPersonaTags.AsNoTracking()
            .Where(t => t.PersonaId == personaId)
            .Select(t => t.PhotoId)
            .ToListAsync();

    public async Task SetTagsAsync(PhotoId photoId, BaulId baulId, IEnumerable<PersonaId> personaIds, DateTime now)
    {
        await dbContext.PhotoPersonaTags.Where(t => t.PhotoId == photoId).ExecuteDeleteAsync();
        dbContext.PhotoPersonaTags.AddRange(personaIds.Select(personaId => new PhotoPersonaTag(photoId, personaId, baulId, now)));
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.PhotoPersonaTags.Where(t => t.BaulId == baulId).ExecuteDeleteAsync();
    }

    public async Task DeleteByPersonaIdAsync(PersonaId personaId)
    {
        await dbContext.PhotoPersonaTags.Where(t => t.PersonaId == personaId).ExecuteDeleteAsync();
    }
}
