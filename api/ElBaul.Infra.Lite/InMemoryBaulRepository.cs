using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning — this is a Singleton serving genuinely concurrent HTTP requests
// in el-baul-api-lite, not a single-threaded test fixture.
public class InMemoryBaulRepository(IPersonaRepository personaRepository) : IBaulRepository
{
    private readonly Dictionary<BaulId, Baul> _baules = new();
    private readonly Lock _lock = new();

    public Task<Baul?> GetByIdAsync(BaulId id)
    {
        lock (_lock) return Task.FromResult(_baules.GetValueOrDefault(id));
    }

    public Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(UserId userId)
    {
        lock (_lock) return Task.FromResult(_baules.Values.Where(b => b.CustodioId == userId).ToList().AsEnumerable());
    }

    public async Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(UserId userId)
    {
        // The custodian's own baules are excluded here (Baul.CustodioId == userId): see
        // BaulRepository.GetSharedByUserIdAsync for why.
        var personas = await personaRepository.GetByUserIdAsync(userId);
        lock (_lock)
        {
            return personas
                .Where(s => s.Role != BaulRole.SinAcceso && _baules[s.BaulId].CustodioId != userId)
                .Select(s => new BaulAccess(_baules[s.BaulId], s.Role))
                .ToList();
        }
    }

    public Task CreateAsync(Baul baul)
    {
        lock (_lock) _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Baul baul)
    {
        lock (_lock) _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(BaulId id)
    {
        lock (_lock) _baules.Remove(id);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<Baul>> GetWithLegacyCoverPhotoKeyAsync()
    {
        lock (_lock)
            return Task.FromResult(_baules.Values
                .Where(b => b.CoverPhotoKey is not null && b.CoverPhotoId is null)
                .ToList().AsEnumerable());
    }

    public Task SetCoverPhotoIdAsync(BaulId id, PhotoId coverPhotoId)
    {
        lock (_lock)
        {
            if (_baules.TryGetValue(id, out var baul))
                _baules[id] = baul with { CoverPhotoId = coverPhotoId };
        }
        return Task.CompletedTask;
    }
}
