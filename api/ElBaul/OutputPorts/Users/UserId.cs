namespace ElBaul.OutputPorts.Users;
// Wraps the OIDC `sub` claim backing User.Id. Unlike BaulId/PhotoId/etc. this isn't a
// Guid — OIDC subject ids aren't guaranteed GUID-shaped (see docs/architecture/backend.md) —
// and it's deliberately unvalidated: the claim is opaque, so there's nothing to check beyond
// "a string was supplied".
public readonly record struct UserId(string Value)
{
    public static implicit operator string(UserId id) => id.Value;
    public override string ToString() => Value;
}
