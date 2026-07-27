namespace ElBaul.Ports.Output;

// Strongly-typed entity ids. Conversion to the underlying Guid is implicit (safe: it only
// ever narrows information), but construction from a Guid is explicit-only — an implicit
// Guid -> BaulId conversion would let two mismatched raw-Guid locals be swapped at a call site
// like MoveAsync(photoId, targetChapterId) and still compile, which defeats the point of
// typing these separately in the first place.

public readonly record struct BaulId(Guid Value)
{
    public static implicit operator Guid(BaulId id) => id.Value;
    public override string ToString() => Value.ToString();
}

public readonly record struct ChapterId(Guid Value)
{
    public static implicit operator Guid(ChapterId id) => id.Value;
    public override string ToString() => Value.ToString();
}

public readonly record struct PhotoId(Guid Value)
{
    public static implicit operator Guid(PhotoId id) => id.Value;
    public override string ToString() => Value.ToString();
}

public readonly record struct PersonaId(Guid Value)
{
    public static implicit operator Guid(PersonaId id) => id.Value;
    public override string ToString() => Value.ToString();
}

public readonly record struct RecuerdoId(Guid Value)
{
    public static implicit operator Guid(RecuerdoId id) => id.Value;
    public override string ToString() => Value.ToString();
}

public readonly record struct RemovalRequestId(Guid Value)
{
    public static implicit operator Guid(RemovalRequestId id) => id.Value;
    public override string ToString() => Value.ToString();
}

// A client-generated idempotency token for a photo upload — deliberately its own type rather
// than reusing PhotoId, since it identifies the upload *attempt*, not the resulting photo (see
// IPhotoRepository.GetByClientUploadIdAsync, used to detect and no-op a retried upload).
public readonly record struct ClientUploadId(Guid Value)
{
    public static implicit operator Guid(ClientUploadId id) => id.Value;
    public override string ToString() => Value.ToString();
}
