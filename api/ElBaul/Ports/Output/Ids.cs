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
