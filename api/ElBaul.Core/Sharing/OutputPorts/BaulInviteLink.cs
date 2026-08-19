using ElBaul.Domain;
namespace ElBaul.Core.Sharing.OutputPorts;
public sealed class BaulInviteLink : Entity<BaulInviteLinkId>
{
    public string Token { get; private set; }
    public BaulId BaulId { get; private set; }
    public UserId CreatedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }

    public BaulInviteLink(
    BaulInviteLinkId Id,
    string Token,
    BaulId BaulId,
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null) : base(Id)
    {
        this.Token = Token; this.BaulId = BaulId; this.CreatedBy = CreatedBy;
        this.CreatedAt = CreatedAt; this.RevokedAt = RevokedAt;
    }
    public bool IsRevoked => RevokedAt is not null;

    public BaulInviteLink Revoke(DateTime revokedAt)
    {
        RevokedAt = revokedAt;
        return this;
    }
}
