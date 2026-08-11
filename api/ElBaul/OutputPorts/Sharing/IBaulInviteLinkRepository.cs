using ElBaul.OutputPorts.Shared;
namespace ElBaul.OutputPorts.Sharing;
public interface IBaulInviteLinkRepository
{
    Task<BaulInviteLink?> GetActiveByBaulIdAsync(BaulId baulId);
    Task<BaulInviteLink?> GetByTokenAsync(string token);

    /// <summary>
    /// Inserts the link. A partial unique index guarantees at most one active
    /// (RevokedAt IS NULL) row per baúl — if two callers race to create the first link for a
    /// baúl, the loser's insert is silently dropped (mirrors UserRepository.UpsertAsync): the
    /// row exists now, by whichever caller won, which is all this method promises. Callers
    /// that need the actual active link afterwards should re-read with
    /// GetActiveByBaulIdAsync rather than assume the instance they passed in was persisted.
    /// </summary>
    Task CreateAsync(BaulInviteLink link);

    Task UpdateAsync(BaulInviteLink link);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
