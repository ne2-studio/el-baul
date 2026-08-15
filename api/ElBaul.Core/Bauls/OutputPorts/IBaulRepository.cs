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

    /// <summary>Bauls that still carry a legacy CoverPhotoKey but have never had CoverPhotoId
    /// backfilled — the candidate set backfill-baul-chapter-cover-photo-id resolves. See
    /// Baul.CoverPhotoKey for why the field still exists at all.</summary>
    Task<IEnumerable<Baul>> GetWithLegacyCoverPhotoKeyAsync();

    /// <summary>Sets CoverPhotoId directly, bypassing the normal Baul.WithCoverPhotoId/
    /// UpdateAsync path — used only by the backfill command, which must not bump UpdatedAt for
    /// a purely internal migration of an already-existing cover reference (mirrors
    /// IRecuerdoRepository.SetBaulIdAsync).</summary>
    Task SetCoverPhotoIdAsync(BaulId id, PhotoId coverPhotoId);

    /// <summary>Hard-deletes the Baul row itself. Callers must first clear every child
    /// collection (Chapters, Personas, RemovalRequests, and — via IPhotoRepository/
    /// IRecuerdoRepository/IRemovalRequestRepository/IPersonaRepository —
    /// Photos/Recuerdos/RemovalRequests/Personas) since the in-memory (Lite) backend has no
    /// real FK cascade to fall back on; admin callers should use IAdminBaulDeletionRepository
    /// for the full sequence.</summary>
    Task DeleteAsync(BaulId id);
}
