namespace ElBaul.Ports.Output;

/// <summary>
/// Owns the Baul aggregate and its baul-scoped child collections (sharing,
/// removal requests) — they never make sense outside the
/// context of a baul, so they're grouped here rather than split into their
/// own repositories.
/// </summary>
public interface IBaulRepository
{
    Task<Baul?> GetByIdAsync(Guid id);
    Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId);
    Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId);
    Task CreateAsync(Baul baul);
    Task UpdateAsync(Baul baul);

    // Sharing
    Task<IEnumerable<Persona>> GetPersonasAsync(Guid baulId);
    Task<IReadOnlyDictionary<Guid, int>> GetPersonaCountsAsync(IEnumerable<Guid> baulIds);
    Task<Persona?> GetPersonaByIdAsync(Guid personaId);
    Task<Persona?> GetPersonaByUserIdAsync(Guid baulId, string userId);
    Task AddPersonaAsync(Persona persona);
    Task UpdatePersonaAsync(Persona persona);
    Task RemovePersonaAsync(Guid baulId, Guid personaId);

    // Removal requests
    Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(Guid baulId);
    Task<RemovalRequest?> GetRemovalRequestAsync(Guid baulId, Guid requestId);
    Task CreateRemovalRequestAsync(RemovalRequest request);
    Task DeleteRemovalRequestAsync(Guid baulId, Guid requestId);
}
