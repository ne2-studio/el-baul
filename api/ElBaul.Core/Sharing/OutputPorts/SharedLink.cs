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
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null
)
{
    public bool IsRevoked => RevokedAt is not null;

    public SharedLink Revoke(DateTime revokedAt) =>
        this with { RevokedAt = revokedAt };
}
