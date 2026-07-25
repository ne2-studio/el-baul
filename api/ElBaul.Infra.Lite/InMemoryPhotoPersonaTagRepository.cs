using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning. Keyed by (PhotoId, PersonaId), same composite key as the real
// table's primary key.
public class InMemoryPhotoPersonaTagRepository : IPhotoPersonaTagRepository
{
    private readonly Dictionary<(PhotoId PhotoId, PersonaId PersonaId), PhotoPersonaTag> _tags = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<PersonaId>> GetPersonaIdsByPhotoIdAsync(PhotoId photoId)
    {
        lock (_lock)
            return Task.FromResult(_tags.Values.Where(t => t.PhotoId == photoId).Select(t => t.PersonaId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<PhotoId>> GetPhotoIdsByPersonaIdAsync(PersonaId personaId)
    {
        lock (_lock)
            return Task.FromResult(_tags.Values.Where(t => t.PersonaId == personaId).Select(t => t.PhotoId).ToList().AsEnumerable());
    }

    public Task SetTagsAsync(PhotoId photoId, BaulId baulId, IEnumerable<PersonaId> personaIds, DateTime now)
    {
        lock (_lock)
        {
            foreach (var key in _tags.Keys.Where(k => k.PhotoId == photoId).ToList())
                _tags.Remove(key);

            foreach (var personaId in personaIds)
                _tags[(photoId, personaId)] = new PhotoPersonaTag(photoId, personaId, baulId, now);
        }
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            foreach (var key in _tags.Values.Where(t => t.BaulId == baulId).Select(t => (t.PhotoId, t.PersonaId)).ToList())
                _tags.Remove(key);
        }
        return Task.CompletedTask;
    }

    public Task DeleteByPersonaIdAsync(PersonaId personaId)
    {
        lock (_lock)
        {
            foreach (var key in _tags.Keys.Where(k => k.PersonaId == personaId).ToList())
                _tags.Remove(key);
        }
        return Task.CompletedTask;
    }
}
