namespace ElBaul.Ports.Output;

/// <summary>
/// Owns the Baul aggregate and its baul-scoped child collections (sharing,
/// access requests, removal requests) — they never make sense outside the
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
    Task<IEnumerable<SharedUser>> GetSharedUsersAsync(Guid baulId);
    Task<SharedUser?> GetSharedUserByIdAsync(Guid sharedUserId);
    Task<SharedUser?> GetSharedUserByUserIdAsync(Guid baulId, string userId);
    Task<SharedUser?> GetSharedUserByEmailAsync(Guid baulId, string email);
    Task AddSharedUserAsync(SharedUser sharedUser);
    Task UpdateSharedUserAsync(SharedUser sharedUser);
    Task RemoveSharedUserAsync(Guid baulId, string email);

    // Access requests
    Task<IEnumerable<AccessRequest>> GetAccessRequestsAsync(Guid baulId);
    Task<AccessRequest?> GetAccessRequestAsync(Guid baulId, Guid requestId);
    Task CreateAccessRequestAsync(AccessRequest request);
    Task DeleteAccessRequestAsync(Guid baulId, Guid requestId);

    // Removal requests
    Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(Guid baulId);
    Task<RemovalRequest?> GetRemovalRequestAsync(Guid baulId, Guid requestId);
    Task CreateRemovalRequestAsync(RemovalRequest request);
    Task DeleteRemovalRequestAsync(Guid baulId, Guid requestId);
}
