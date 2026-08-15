using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Personas.OutputPorts;
// The three observable phases of a Persona's access: invited but unclaimed, claimed by an
// account, or revoked. Derived from (Role, UserId) rather than stored, because BaulRoleParser
// never accepts "sin_acceso" from the wire — Revoked is only ever reached via Persona.Revoke().
public enum PersonaAccessStatus { Pending, Active, Revoked }

public record Persona
(
    PersonaId Id,
    BaulId BaulId,
    UserId? UserId,
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

    // The custodio's own access can never be revoked — RemovePersonaAsync and
    // UpdatePersonaRoleAsync check this before touching a row. Custody lives solely on
    // Baul.CustodioId (see BaulRole.cs for why it isn't a Role value), so this is a single
    // comparison, not a fallback across two signals.
    public bool IsCustodioProtected(UserId custodioUserId) => UserId == custodioUserId;

    // Links a Pending Persona to an authenticated account claiming to be that family member —
    // called from BaulInviteLinkManager.AcceptAsync once the caller picks this row from the
    // claimable list. Name is only backfilled, never overwritten, so an admin-provided name
    // always wins.
    public Persona AcceptInvite(UserId userId, string? fallbackName) =>
        this with { UserId = userId, Name = Name ?? fallbackName };

    public Persona WithIdentity(string? name, string nickname) =>
        this with { Name = name, Nickname = nickname };

    public Persona WithBiografia(string? biografia) =>
        this with { Biografia = biografia };

    public Persona WithRole(BaulRole role) =>
        this with { Role = role };

    public Persona WithAvatarPhoto(Photo photo, decimal cropX, decimal cropY, decimal cropScale) =>
        this with
        {
            AvatarPhotoKey = null,
            AvatarPhotoId = photo.Id,
            AvatarCropX = cropX,
            AvatarCropY = cropY,
            AvatarCropScale = cropScale
        };

    // Repoints the avatar to a different photo id without touching AvatarPhotoKey/crop — used by
    // PhotoDuplicateMergeService when the duplicate being merged away is currently someone's
    // avatar photo. Unlike WithAvatarPhoto (the user-initiated "pick a new avatar" action), this
    // never resets the crop: the survivor's blob is bit-identical, so the existing framing still
    // applies.
    public Persona WithAvatarPhotoId(PhotoId photoId) =>
        this with { AvatarPhotoId = photoId };

    // The only way a Persona reaches Revoked — clears the account link alongside the role so
    // the two never drift out of sync (see PersonaAccessStatus).
    public Persona Revoke() => this with { UserId = null, Role = BaulRole.SinAcceso };

    // Admin-only escape hatch for accounts that ended up claiming the wrong Persona (e.g. a
    // family member with several email addresses who created duplicate Personas in the same
    // baúl). Unlike Revoke, this keeps Role as-is, so AccessStatus falls back to Pending — the
    // row becomes claimable again by another account instead of turning into sin_acceso.
    public Persona Unlink() => this with { UserId = null };
}
