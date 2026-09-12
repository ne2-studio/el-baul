using ElBaul.Core.Personas.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Personas.OutputPorts;
public interface IPersonaSpouseRelationshipRepository
{
    Task<IEnumerable<PersonaSpouseRelationship>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Looks up the one relationship between these two personas regardless of which is
    /// stored in which slot — used to enforce "no duplicate, either order" on create.</summary>
    Task<PersonaSpouseRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB);

    /// <summary>Looks up this persona's one spouse relationship, if any — used to enforce
    /// "at most one spouse per persona" (monogamous families) on create.</summary>
    Task<PersonaSpouseRelationship?> GetForPersonaAsync(PersonaId personaId);

    Task AddAsync(PersonaSpouseRelationship relationship);
    Task RemoveAsync(PersonaId personaId1, PersonaId personaId2);

    /// <summary>Used by the admin hard-delete flow. Both FKs on this table are Restrict (see
    /// PersonaSpouseRelationshipConfiguration), so this must run before Personas are deleted.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);
}
