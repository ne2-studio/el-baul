using ElBaul.Core.Personas.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Personas.OutputPorts;

/// <summary>
/// Owns the Persona entity. Personas are baul-scoped like most entities in this domain, but
/// that alone doesn't make them Bauls' responsibility — they're their own feature (claiming,
/// roles, avatars, biografía) and get their own repository for discoverability, the same way
/// RemovalRequest got its own out of Bauls.OutputPorts.IBaulRepository.
/// </summary>
public interface IPersonaRepository
{
    Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId);
    Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds);
    Task<Persona?> GetPersonaByIdAsync(PersonaId personaId);

    /// <summary>Batch-friendly counterpart to GetPersonaByIdAsync — one query for a whole list
    /// of persona ids instead of one round trip per id (e.g. resolving a photo's tagged
    /// personas).</summary>
    Task<IEnumerable<Persona>> GetPersonasByIdsAsync(IEnumerable<PersonaId> personaIds);
    Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, UserId userId);

    /// <summary>Resolves a persona-scoped invite link token back to its Persona — used by
    /// PersonaInviteManager to serve the public preview/landing/accept flow. See
    /// Persona.InviteToken.</summary>
    Task<Persona?> GetPersonaByInviteTokenAsync(string token);

    /// <summary>Every claimed persona for a user, across every baúl — used to resolve which
    /// baúles a user has been shared into (see BaulRepository.GetSharedByUserIdAsync).</summary>
    Task<IEnumerable<Persona>> GetByUserIdAsync(UserId userId);

    Task AddPersonaAsync(Persona persona);
    Task UpdatePersonaAsync(Persona persona);
    Task RemovePersonaAsync(BaulId baulId, PersonaId personaId);
    Task RemoveAllPersonasAsync(BaulId baulId);
}
