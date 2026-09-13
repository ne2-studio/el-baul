using ElBaul.Domain;

namespace ElBaul.Core.Admin.OutputPorts;

/// <summary>
/// Owns the hard-delete graph for one baúl in the FK-safe order the real schema requires. This
/// is intentionally separate from the ordinary aggregate repositories.
///
/// Since Slice 2 of the multi-vault photo groundwork (docs/.backlog issue #62), this
/// deliberately does NOT delete any Photo's storage object or PhotoAsset row: a Photo's asset
/// may now be shared with a Photo in a different baúl, so deleting it here as a side effect of
/// deleting this baúl's Photo rows could silently break that other baúl. PhotoAsset lifetime is
/// no longer coupled to Photo/baúl lifetime — an orphaned asset left behind here is expected to
/// be cleaned up by Slice 3's garbage collection, not by this hard-delete path.
/// </summary>
public interface IAdminBaulDeletionRepository
{
    /// <returns>false if the baúl doesn't exist; true once its graph has been deleted.</returns>
    Task<bool> DeleteBaulGraphAsync(BaulId baulId);
}
