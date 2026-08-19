using ElBaul.Core.Bauls.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Bauls.OutputPorts;
/// <summary>
/// Owns the Baul aggregate. Personas are a Personas concern and live in
/// Personas.OutputPorts.IPersonaRepository instead — like RemovalRequest, being baul-scoped
/// doesn't make an entity Bauls' responsibility (most entities in this domain are baul-scoped).
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
    /// IRecuerdoRepository/IRemovalRequestRepository/IPersonaRepository —
    /// Photos/Recuerdos/RemovalRequests/Personas) since the in-memory (Lite) backend has no
    /// real FK cascade to fall back on; admin callers should use IAdminBaulDeletionRepository
    /// for the full sequence.</summary>
    Task DeleteAsync(BaulId id);
}
