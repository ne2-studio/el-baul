using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

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

    public async Task<IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>>> GetPersonaIdsByPhotoIdsAsync(IEnumerable<PhotoId> photoIds)
    {
        var ids = photoIds.ToList();
        var tags = await dbContext.PhotoPersonaTags.AsNoTracking()
            .Where(t => ids.Contains(t.PhotoId))
            .ToListAsync();

        return tags
            .GroupBy(t => t.PhotoId)
            .ToDictionary(g => g.Key, IReadOnlyList<PersonaId> (g) => g.Select(t => t.PersonaId).ToList());
    }

    public async Task SetTagsAsync(PhotoId photoId, BaulId baulId, IEnumerable<PersonaId> personaIds, DateTime now)
    {
        await dbContext.PhotoPersonaTags.Where(t => t.PhotoId == photoId).ExecuteDeleteAsync();
        dbContext.PhotoPersonaTags.AddRange(personaIds.Select(personaId => new PhotoPersonaTag(photoId, personaId, baulId, now)));
        await dbContext.SaveChangesAsync();
    }

    public async Task SetTagsForManyAsync(BaulId baulId, IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>> tagsByPhotoId, DateTime now)
    {
        var photoIds = tagsByPhotoId.Keys.ToList();
        await dbContext.PhotoPersonaTags.Where(t => photoIds.Contains(t.PhotoId)).ExecuteDeleteAsync();

        var newTags = tagsByPhotoId.SelectMany(kv =>
            kv.Value.Select(personaId => new PhotoPersonaTag(kv.Key, personaId, baulId, now)));
        dbContext.PhotoPersonaTags.AddRange(newTags);
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
