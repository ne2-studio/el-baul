using ElBaul.Domain;
namespace ElBaul.Core.TvMode.Domain;
// Temporary, read-only access to one baúl's photos for Modo TV — see docs PRD "Modo TV".
// Deliberately time-limited (ExpiresAt), unlike SharedLink/BaulInviteLink which only revoke
// manually: a session left open on a TV that isn't yours is the main risk this feature adds
// (see the PRD's risk table), so it must go stale on its own, not just on request.
public sealed class TvSession : Entity<TvSessionId>
{
    public string Token { get; private set; }
    public BaulId BaulId { get; private set; }
    public UserId CreatedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }

    public TvSession(
    TvSessionId Id,
    string Token,
    BaulId BaulId,
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? RevokedAt = null) : base(Id)
    {
        this.Token = Token; this.BaulId = BaulId; this.CreatedBy = CreatedBy;
        this.CreatedAt = CreatedAt; this.ExpiresAt = ExpiresAt; this.RevokedAt = RevokedAt;
    }
    public bool IsRevoked => RevokedAt is not null;
    public bool IsExpired(DateTime now) => now >= ExpiresAt;
    public bool IsActive(DateTime now) => !IsRevoked && !IsExpired(now);

    public TvSession Revoke(DateTime revokedAt)
    {
        RevokedAt = revokedAt;
        return this;
    }
}
