using ElBaul.Shared;
namespace ElBaul.OutputPorts.Sharing;
public record BaulInviteLink
(
    BaulInviteLinkId Id,
    string Token,
    BaulId BaulId,
    string CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null
)
{
    public bool IsRevoked => RevokedAt is not null;
}
