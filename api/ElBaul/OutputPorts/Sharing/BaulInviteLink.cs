using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Sharing;
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
}
