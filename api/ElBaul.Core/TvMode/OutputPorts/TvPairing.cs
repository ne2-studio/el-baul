using ElBaul.Domain;
namespace ElBaul.Core.TvMode.OutputPorts;

// The handshake between a TV's landing page (see docs PRD "Modo TV") and the phone that scans
// its QR code. Deliberately baúl-agnostic and short-lived — unlike TvSession, this never gets
// authorized against a baúl itself; it just waits for ClaimAsync to turn it into one. The TV
// polls GetByCodeAsync until ClaimedSessionToken appears, then jumps straight to
// /tv/{ClaimedSessionToken} — the same route TvSessionRoute already served the old link-based
// flow with, unchanged.
public sealed class TvPairing : Entity<TvPairingId>
{
    public string Code { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public string? ClaimedSessionToken { get; private set; }

    public TvPairing(
    TvPairingId Id,
    string Code,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    string? ClaimedSessionToken = null) : base(Id)
    {
        this.Code = Code; this.CreatedAt = CreatedAt; this.ExpiresAt = ExpiresAt;
        this.ClaimedSessionToken = ClaimedSessionToken;
    }
    public bool IsClaimed => ClaimedSessionToken is not null;
    public bool IsExpired(DateTime now) => now >= ExpiresAt;
    public bool IsActive(DateTime now) => !IsExpired(now);

    public TvPairing Claim(string sessionToken)
    {
        ClaimedSessionToken = sessionToken;
        return this;
    }
}
