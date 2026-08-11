using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Bauls;
/// <summary>
/// Owns the Baul aggregate and its baul-scoped child collections (sharing,
/// removal requests) — they never make sense outside the
/// context of a baul, so they're grouped here rather than split into their
/// own repositories.
/// </summary>
public interface IBaulRepository
{
    Task<Baul?> GetByIdAsync(BaulId id);
    Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(UserId userId);
    Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(UserId userId);

    /// <summary>Every baúl this user can currently see — owned (custodio) or shared (any
    /// active membership role), deduplicated by id. The one place this merge rule lives; see
    /// WelcomeEmailManager/WeeklyDigestManager/PushDigestManager. BaulManager.
    /// GetAllForCurrentUserAsync still calls GetOwnedByUserIdAsync/GetSharedByUserIdAsync
    /// directly instead, since it needs each baúl's role/isCustodio, which this collapses
    /// away.</summary>
    Task<IEnumerable<Baul>> GetAccessibleByUserIdAsync(UserId userId);

    Task CreateAsync(Baul baul);
    Task UpdateAsync(Baul baul);

    /// <summary>Hard-deletes the Baul row itself. Callers must first clear every child
    /// collection (Chapters, Personas, RemovalRequests, and — via IPhotoRepository/
    /// IRecuerdoRepository — Photos/Recuerdos) since the in-memory (Lite) backend has no real
    /// FK cascade to fall back on; see AdminManager.DeleteBaulAsync for the full sequence.</summary>
    Task DeleteAsync(BaulId id);

    // Sharing
    Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId);
    Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds);
    Task<Persona?> GetPersonaByIdAsync(PersonaId personaId);

    /// <summary>Batch-friendly counterpart to GetPersonaByIdAsync — one query for a whole list
    /// of persona ids instead of one round trip per id (e.g. resolving a photo's tagged
    /// personas).</summary>
    Task<IEnumerable<Persona>> GetPersonasByIdsAsync(IEnumerable<PersonaId> personaIds);
    Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, UserId userId);
    Task AddPersonaAsync(Persona persona);
    Task UpdatePersonaAsync(Persona persona);
    Task RemovePersonaAsync(BaulId baulId, PersonaId personaId);
    Task RemoveAllPersonasAsync(BaulId baulId);

    // Removal requests
    Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId);
    Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task CreateRemovalRequestAsync(RemovalRequest request);
    Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task DeleteAllRemovalRequestsAsync(BaulId baulId);
}
