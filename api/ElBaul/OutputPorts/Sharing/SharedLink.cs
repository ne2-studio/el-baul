using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Sharing;
public enum SharedLinkContentType
{
    Photo,
    Recuerdo
}

public record SharedLink
(
    SharedLinkId Id,
    string Token,
    BaulId BaulId,
    SharedLinkContentType ContentType,
    PhotoId? PhotoId,
    RecuerdoId? RecuerdoId,
    string CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null
)
{
    public bool IsRevoked => RevokedAt is not null;
}
