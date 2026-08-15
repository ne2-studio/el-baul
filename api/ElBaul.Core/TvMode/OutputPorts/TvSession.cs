using ElBaul.Domain;
namespace ElBaul.Core.TvMode.OutputPorts;

// Temporary, read-only access to one baúl's photos for Modo TV — see docs PRD "Modo TV".
// Deliberately time-limited (ExpiresAt), unlike SharedLink/BaulInviteLink which only revoke
// manually: a session left open on a TV that isn't yours is the main risk this feature adds
// (see the PRD's risk table), so it must go stale on its own, not just on request.
public record TvSession
(
    TvSessionId Id,
    string Token,
    BaulId BaulId,
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? RevokedAt = null
)
{
    public bool IsRevoked => RevokedAt is not null;
    public bool IsExpired(DateTime now) => now >= ExpiresAt;
    public bool IsActive(DateTime now) => !IsRevoked && !IsExpired(now);

    public TvSession Revoke(DateTime revokedAt) =>
        this with { RevokedAt = revokedAt };
}
