using ElBaul.OutputPorts.Photos;
using ElBaul.Domain;
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

    public Task<IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>>> GetPersonaIdsByPhotoIdsAsync(IEnumerable<PhotoId> photoIds)
    {
        lock (_lock)
        {
            var ids = photoIds.ToHashSet();
            IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>> result = _tags.Values
                .Where(t => ids.Contains(t.PhotoId))
                .GroupBy(t => t.PhotoId)
                .ToDictionary(g => g.Key, IReadOnlyList<PersonaId> (g) => g.Select(t => t.PersonaId).ToList());
            return Task.FromResult(result);
        }
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

    public Task SetTagsForManyAsync(BaulId baulId, IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>> tagsByPhotoId, DateTime now)
    {
        lock (_lock)
        {
            foreach (var photoId in tagsByPhotoId.Keys)
            {
                foreach (var key in _tags.Keys.Where(k => k.PhotoId == photoId).ToList())
                    _tags.Remove(key);
            }

            foreach (var (photoId, personaIds) in tagsByPhotoId)
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
