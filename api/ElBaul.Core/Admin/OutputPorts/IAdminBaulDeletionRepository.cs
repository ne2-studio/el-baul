using ElBaul.Domain;

namespace ElBaul.Core.Admin.OutputPorts;

public sealed record DeletedBaulStorageObjects(IReadOnlyList<string> PhotoStorageKeys);

/// <summary>
/// Owns the storage-side hard-delete graph for one baúl. This is intentionally separate from
/// the ordinary aggregate repositories: the real implementation must satisfy Postgres FK order
/// and transaction semantics, while callers only need to know which blobs should be cleaned up
/// after the rows are gone.
/// </summary>
public interface IAdminBaulDeletionRepository
{
    Task<DeletedBaulStorageObjects?> DeleteBaulGraphAsync(BaulId baulId);
}
