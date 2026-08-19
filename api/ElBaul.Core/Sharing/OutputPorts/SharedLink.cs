using ElBaul.Domain;
namespace ElBaul.Core.Sharing.OutputPorts;
public enum SharedLinkContentType
{
    Photo,
    Recuerdo
}

public sealed class SharedLink : Entity<SharedLinkId>
{
    public string Token { get; private set; }
    public BaulId BaulId { get; private set; }
    public SharedLinkContentType ContentType { get; private set; }
    public PhotoId? PhotoId { get; private set; }
    public RecuerdoId? RecuerdoId { get; private set; }
    public UserId CreatedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }

    public SharedLink(
    SharedLinkId Id,
    string Token,
    BaulId BaulId,
    SharedLinkContentType ContentType,
    PhotoId? PhotoId,
    RecuerdoId? RecuerdoId,
    UserId CreatedBy,
    DateTime CreatedAt,
    DateTime? RevokedAt = null) : base(Id)
    {
        this.Token = Token; this.BaulId = BaulId; this.ContentType = ContentType;
        this.PhotoId = PhotoId; this.RecuerdoId = RecuerdoId; this.CreatedBy = CreatedBy;
        this.CreatedAt = CreatedAt; this.RevokedAt = RevokedAt;
    }
    public bool IsRevoked => RevokedAt is not null;

    public SharedLink ForPhoto(PhotoId photoId)
    {
        PhotoId = photoId;
        return this;
    }

    public SharedLink Revoke(DateTime revokedAt)
    {
        RevokedAt = revokedAt;
        return this;
    }
}
