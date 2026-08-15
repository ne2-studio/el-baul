using ElBaul.Domain;
namespace ElBaul.Core.Sharing.OutputPorts;
public record BaulInviteLink
(
    BaulInviteLinkId Id,
    string Token,
    BaulId BaulId,
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null
)
{
    public bool IsRevoked => RevokedAt is not null;

    public BaulInviteLink Revoke(DateTime revokedAt) =>
        this with { RevokedAt = revokedAt };
}
