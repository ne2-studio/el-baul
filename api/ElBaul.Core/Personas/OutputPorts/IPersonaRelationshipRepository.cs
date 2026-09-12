using ElBaul.Core.Personas.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Personas.OutputPorts;
public interface IPersonaRelationshipRepository
{
    Task<IEnumerable<PersonaRelationship>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Looks up the one relationship between these two personas regardless of which is
    /// stored as parent/child — used to enforce "no duplicate, either direction" on create.</summary>
    Task<PersonaRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB);

    Task AddAsync(PersonaRelationship relationship);
    Task RemoveAsync(PersonaId parentId, PersonaId childId);

    /// <summary>Used by the admin hard-delete flow. Both FKs on this table are Restrict (see
    /// PersonaRelationshipConfiguration), so this must run before Personas are deleted.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);
}
