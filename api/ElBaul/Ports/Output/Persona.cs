namespace ElBaul.Ports.Output;

// The three observable phases of a Persona's access: invited but unclaimed, claimed by an
// account, or revoked. Derived from (Role, UserId) rather than stored, because BaulRoleParser
// never accepts "sin_acceso" from the wire — Revoked is only ever reached via Persona.Revoke().
public enum PersonaAccessStatus { Pending, Active, Revoked }

public record Persona
(
    PersonaId Id,
    BaulId BaulId,
    string? UserId,
    string Nickname,
    BaulRole Role,
    DateTime InvitedDate,
    string? Name = null,
    string? AvatarPhotoKey = null,
    string? Biografia = null,
    PhotoId? AvatarPhotoId = null,
    decimal AvatarCropX = 0.5m,
    decimal AvatarCropY = 0.5m,
    decimal AvatarCropScale = 1m
)
{
    // The single interpretation of "is this Persona row linked to an authenticated account" —
    // callers should ask this instead of re-deriving it from UserId nullity by hand.
    public bool IsClaimed => UserId is not null;

    public PersonaAccessStatus AccessStatus => Role == BaulRole.SinAcceso
        ? PersonaAccessStatus.Revoked
        : IsClaimed ? PersonaAccessStatus.Active : PersonaAccessStatus.Pending;

    // Whether a joining account can link itself to this row instead of getting a brand new
    // Persona — offered during the global invite link's "who are you" step. Equivalent to
    // AccessStatus == Pending, spelled out separately because this is the one call site that
    // cares about the claim capability itself, not the wider status tri-state.
    public bool IsClaimable => AccessStatus == PersonaAccessStatus.Pending;

    // The custodio's own access can never be revoked — RemovePersonaAsync checks this before
    // calling Revoke(), whether the target row is itself Custodio-stamped or merely belongs to
    // the baúl's custodio account.
    public bool IsCustodioProtected(string custodioUserId) =>
        Role == BaulRole.Custodio || UserId == custodioUserId;

    // Links a Pending Persona to an authenticated account claiming to be that family member —
    // called only after the caller picked this row from the claimable list (BaulInviteLinkManager
    // .AcceptAsync), never from a per-persona link (that flow was removed, see ADR 0004). Name is
    // only backfilled, never overwritten, so an admin-provided name always wins.
    public Persona AcceptInvite(string userId, string? fallbackName) =>
        this with { UserId = userId, Name = Name ?? fallbackName };

    // The only way a Persona reaches Revoked — clears the account link alongside the role so
    // the two never drift out of sync (see PersonaAccessStatus).
    public Persona Revoke() => this with { UserId = null, Role = BaulRole.SinAcceso };
}
