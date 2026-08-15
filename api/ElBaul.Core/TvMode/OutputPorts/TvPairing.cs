using ElBaul.Domain;
namespace ElBaul.Core.TvMode.OutputPorts;

// The handshake between a TV's landing page (see docs PRD "Modo TV") and the phone that scans
// its QR code. Deliberately baúl-agnostic and short-lived — unlike TvSession, this never gets
// authorized against a baúl itself; it just waits for ClaimAsync to turn it into one. The TV
// polls GetByCodeAsync until ClaimedSessionToken appears, then jumps straight to
// /tv/{ClaimedSessionToken} — the same route TvSessionRoute already served the old link-based
// flow with, unchanged.
public record TvPairing
(
    TvPairingId Id,
    string Code,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    string? ClaimedSessionToken = null
)
{
    public bool IsClaimed => ClaimedSessionToken is not null;
    public bool IsExpired(DateTime now) => now >= ExpiresAt;
    public bool IsActive(DateTime now) => !IsExpired(now);

    public TvPairing Claim(string sessionToken) =>
        this with { ClaimedSessionToken = sessionToken };
}
