using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Personas.Domain;
// The two observable phases of a Persona's access: invited but unclaimed, or claimed by an
// account. Derived from UserId nullity rather than stored. There used to be a third,
// Revoked, phase (Role == SinAcceso) — removed along with the global invite-link model: a
// Persona is either in the baúl or not, revoking access now just clears UserId/InviteToken
// (see Persona.RevokeAccess) and the row falls straight back to Pending.
public enum PersonaAccessStatus { Pending, Active }

public sealed class Persona : Entity<PersonaId>
{
    private Persona() : base(default!)
    {
        Nickname = null!;
        AvatarCrop = ImageCrop.DefaultCoverCrop;
    }

    public BaulId BaulId { get; private set; }
    public UserId? UserId { get; private set; }
    public string Nickname { get; private set; }
    public BaulRole Role { get; private set; }
    public DateTime InvitedDate { get; private set; }
    public string? Name { get; private set; }
    public string? Biografia { get; private set; }
    public PhotoId? AvatarPhotoId { get; private set; }
    public ImageCrop AvatarCrop { get; private set; }
    // Persona-scoped invite link token — replaces the old baúl-scoped, regenerable
    // BaulInviteLink. Null until an admin taps "Invitar" for the first time (issued lazily,
    // see PersonaInviteManager.InviteAsync), and cleared again by RevokeAccess/Unlink so a
    // revoked or unlinked persona always needs a fresh token before it can be invited again.
    public string? InviteToken { get; private set; }

    public Persona(
    PersonaId Id,
    BaulId BaulId,
    UserId? UserId,
    string Nickname,
    BaulRole Role,
    DateTime InvitedDate,
    ImageCrop AvatarCrop,
    string? Name = null,
    string? Biografia = null,
    PhotoId? AvatarPhotoId = null,
    string? InviteToken = null) : base(Id)
    {
        this.BaulId = BaulId; this.UserId = UserId; this.Nickname = Nickname; this.Role = Role;
        this.InvitedDate = InvitedDate; this.Name = Name; this.Biografia = Biografia;
        this.AvatarPhotoId = AvatarPhotoId; this.AvatarCrop = AvatarCrop; this.InviteToken = InviteToken;
    }

    public Persona(
        PersonaId Id, BaulId BaulId, UserId? UserId, string Nickname, BaulRole Role, DateTime InvitedDate,
        string? Name = null, string? Biografia = null, PhotoId? AvatarPhotoId = null,
        decimal AvatarCropX = 0.5m, decimal AvatarCropY = 0.5m, decimal AvatarCropScale = 1m,
        string? InviteToken = null)
        : this(Id, BaulId, UserId, Nickname, Role, InvitedDate,
            new ImageCrop(AvatarCropX, AvatarCropY, AvatarCropScale), Name, Biografia, AvatarPhotoId, InviteToken)
    {
    }
    // The single interpretation of "is this Persona row linked to an authenticated account" —
    // callers should ask this instead of re-deriving it from UserId nullity by hand.
    public bool IsClaimed => UserId is not null;

    public PersonaAccessStatus AccessStatus => IsClaimed ? PersonaAccessStatus.Active : PersonaAccessStatus.Pending;

    // The custodio's own access can never be revoked — RemovePersonaAsync and
    // UpdatePersonaRoleAsync check this before touching a row. Custody lives solely on
    // Baul.CustodioId (see BaulRole.cs for why it isn't a Role value), so this is a single
    // comparison, not a fallback across two signals.
    public bool IsCustodioProtected(UserId custodioUserId) => UserId == custodioUserId;

    // Links a Pending Persona to the authenticated account that just accepted its per-person
    // invite token — called from PersonaInviteManager.AcceptAsync once the token has been
    // resolved back to this row. Name is only backfilled, never overwritten, so an
    // admin-provided name always wins.
    public Persona AcceptInvite(UserId userId, string? fallbackName) =>
        Mutate(() => { UserId = userId; Name ??= fallbackName; });

    // Issues this persona's invite token the first time an admin taps "Invitar" — idempotent:
    // if a token is already set (still-Pending persona re-shared, or somehow raced), the
    // existing one wins and the freshly generated candidate is discarded, so re-inviting never
    // silently swaps out a link that may already be in someone's hands.
    public Persona IssueInviteToken(string candidateToken) =>
        Mutate(() => InviteToken ??= candidateToken);

    public Persona WithIdentity(string? name, string nickname) =>
        Mutate(() => { Name = name; Nickname = nickname; });

    public Persona WithBiografia(string? biografia) =>
        Mutate(() => Biografia = biografia);

    public Persona WithRole(BaulRole role) =>
        Mutate(() => Role = role);

    public Persona WithAvatarPhoto(Photo photo, ImageCrop crop) =>
        Mutate(() => { AvatarPhotoId = photo.Id; AvatarCrop = crop; });

    // Repoints the avatar to a different photo id without touching the crop — used by
    // PhotoDuplicateMergeService when the duplicate being merged away is currently someone's
    // avatar photo. Unlike WithAvatarPhoto (the user-initiated "pick a new avatar" action), this
    // never resets the crop: the survivor's blob is bit-identical, so the existing framing still
    // applies.
    public Persona WithAvatarPhotoId(PhotoId photoId) =>
        Mutate(() => AvatarPhotoId = photoId);

    // "Revocar acceso" — clears the account link and the invite token together, so the old
    // per-person link stops working immediately (explicit exception to invite tokens otherwise
    // being permanent/non-regenerable). Role is left untouched: there is no more sin_acceso
    // state to move into, the row just falls back to Pending and can be re-invited normally,
    // which lazily issues it a fresh token.
    public Persona RevokeAccess() => Mutate(() => { UserId = null; InviteToken = null; });

    // Admin-only escape hatch for accounts that ended up claiming the wrong Persona (e.g. a
    // family member with several email addresses who created duplicate Personas in the same
    // baúl). Clears the invite token for the same reason as RevokeAccess — the row is
    // Pending again and needs a fresh link before it can be (re-)invited.
    public Persona Unlink() => Mutate(() => { UserId = null; InviteToken = null; });

    private Persona Mutate(Action action) { action(); return this; }
}
