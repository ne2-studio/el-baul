namespace ElBaul.Core.TvMode.InputPorts;

// Code is the shared secret: embedded both in the QR's ClaimUrl (for the phone) and polled by
// the TV itself via GET /api/tv-pairings/{code} — see TvPairingManager.
public record CreateTvPairingResult(string Code, string ClaimUrl, DateTime ExpiresAt);

// What the TV's landing page polls for. SessionToken is only set once Claimed is true, at
// which point the TV navigates straight to /tv/{SessionToken}.
public record TvPairingStatusDto(bool Claimed, string? SessionToken);
