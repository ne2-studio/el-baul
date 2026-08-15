using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Bauls.OutputPorts;
/// <summary>
/// Owns the Baul aggregate and its baul-scoped sharing collection (Personas) — it never makes
/// sense outside the context of a baul, so it's grouped here rather than split into its own
/// repository. Removal requests are a Moderation concern and live in
/// Moderation.OutputPorts.IRemovalRequestRepository instead, even though they're also
/// baul-scoped.
/// </summary>
public interface IBaulRepository
{
    Task<Baul?> GetByIdAsync(BaulId id);
    Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(UserId userId);
    Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(UserId userId);

    Task CreateAsync(Baul baul);
    Task UpdateAsync(Baul baul);

    /// <summary>Hard-deletes the Baul row itself. Callers must first clear every child
    /// collection (Chapters, Personas, RemovalRequests, and — via IPhotoRepository/
    /// IRecuerdoRepository/IRemovalRequestRepository — Photos/Recuerdos/RemovalRequests)
    /// since the in-memory (Lite) backend has no real FK cascade to fall back on; admin
    /// callers should use IAdminBaulDeletionRepository for the full sequence.</summary>
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
}
