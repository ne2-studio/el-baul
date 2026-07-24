namespace ElBaul.Ports.Output;

/// <summary>
/// Owns the Baul aggregate and its baul-scoped child collections (sharing,
/// removal requests) — they never make sense outside the
/// context of a baul, so they're grouped here rather than split into their
/// own repositories.
/// </summary>
public interface IBaulRepository
{
    Task<Baul?> GetByIdAsync(BaulId id);
    Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId);
    Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId);
    Task CreateAsync(Baul baul);
    Task UpdateAsync(Baul baul);

    // Sharing
    Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId);
    Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds);
    Task<Persona?> GetPersonaByIdAsync(PersonaId personaId);
    Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, string userId);
    Task AddPersonaAsync(Persona persona);
    Task UpdatePersonaAsync(Persona persona);
    Task RemovePersonaAsync(BaulId baulId, PersonaId personaId);

    // Removal requests
    Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId);
    Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task CreateRemovalRequestAsync(RemovalRequest request);
    Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
}
