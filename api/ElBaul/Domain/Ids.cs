using Ne2Studio.Common;
namespace ElBaul.Domain;
// Strongly-typed entity ids. Conversion to the underlying Guid is implicit (safe: it only
// ever narrows information), but construction from a Guid is explicit-only — an implicit
// Guid -> BaulId conversion would let two mismatched raw-Guid locals be swapped at a call site
// like MoveAsync(photoId, targetChapterId) and still compile, which defeats the point of
// typing these separately in the first place.
//
// Parse is the single, shared "is this string a valid <id>?" rule for every one of these types —
// the boundary (a controller reading an id out of a request body) calls Parse instead of hand-rolling
// Guid.TryParse plus its own BadRequest message, the same way PhotoDate.Parse and PhotoCrop.Create
// own their own construction rule instead of leaving it to the caller.
internal static class IdParsing
{
    public static Result<TId> Parse<TId>(string? raw, Func<Guid, TId> factory, string typeName) =>
        Guid.TryParse(raw, out var value)
            ? Result.Success(factory(value))
            : Result.Failure<TId>(ApplicationError.Validation($"'{raw}' is not a valid {typeName}."));
}

// Implemented by every id struct below so ElBaul.Api.Common can bind route/query/form/JSON-body
// values to these types directly (IdJsonConverter, IdTypeConverter — both registered from
// ElBaulApiHost, not referenced from here) through the exact same Parse rule their manual
// Result<T>-returning callers already use. Deliberately just a marker interface plus a static
// Parse — nothing in this file references JSON, HTTP, or ASP.NET Core, so this project's "no
// ASP.NET Core" rule (see docs/architecture/backend.md) stays intact; all of that wiring lives
// in the host project instead.
public interface IParsableId<TSelf> where TSelf : struct, IParsableId<TSelf>
{
    static abstract Result<TSelf> Parse(string? raw);
}

public readonly record struct BaulId(Guid Value) : IParsableId<BaulId>
{
    public static implicit operator Guid(BaulId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<BaulId> Parse(string? raw) => IdParsing.Parse(raw, v => new BaulId(v), "baúl id");
}

public readonly record struct ChapterId(Guid Value) : IParsableId<ChapterId>
{
    public static implicit operator Guid(ChapterId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<ChapterId> Parse(string? raw) => IdParsing.Parse(raw, v => new ChapterId(v), "chapter id");
}

public readonly record struct PhotoId(Guid Value) : IParsableId<PhotoId>
{
    public static implicit operator Guid(PhotoId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<PhotoId> Parse(string? raw) => IdParsing.Parse(raw, v => new PhotoId(v), "photo id");
}

public readonly record struct PersonaId(Guid Value) : IParsableId<PersonaId>
{
    public static implicit operator Guid(PersonaId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<PersonaId> Parse(string? raw) => IdParsing.Parse(raw, v => new PersonaId(v), "persona id");
}

public readonly record struct RecuerdoId(Guid Value) : IParsableId<RecuerdoId>
{
    public static implicit operator Guid(RecuerdoId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<RecuerdoId> Parse(string? raw) => IdParsing.Parse(raw, v => new RecuerdoId(v), "recuerdo id");
}

public readonly record struct SharedLinkId(Guid Value) : IParsableId<SharedLinkId>
{
    public static implicit operator Guid(SharedLinkId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<SharedLinkId> Parse(string? raw) => IdParsing.Parse(raw, v => new SharedLinkId(v), "shared link id");
}

public readonly record struct BaulInviteLinkId(Guid Value) : IParsableId<BaulInviteLinkId>
{
    public static implicit operator Guid(BaulInviteLinkId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<BaulInviteLinkId> Parse(string? raw) => IdParsing.Parse(raw, v => new BaulInviteLinkId(v), "baúl invite link id");
}

public readonly record struct TvSessionId(Guid Value) : IParsableId<TvSessionId>
{
    public static implicit operator Guid(TvSessionId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<TvSessionId> Parse(string? raw) => IdParsing.Parse(raw, v => new TvSessionId(v), "TV session id");
}

public readonly record struct RemovalRequestId(Guid Value) : IParsableId<RemovalRequestId>
{
    public static implicit operator Guid(RemovalRequestId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<RemovalRequestId> Parse(string? raw) => IdParsing.Parse(raw, v => new RemovalRequestId(v), "removal request id");
}

public readonly record struct ChatMemoryId(Guid Value) : IParsableId<ChatMemoryId>
{
    public static implicit operator Guid(ChatMemoryId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<ChatMemoryId> Parse(string? raw) => IdParsing.Parse(raw, v => new ChatMemoryId(v), "chat memory id");
}

// A client-generated idempotency token for a photo upload — deliberately its own type rather
// than reusing PhotoId, since it identifies the upload *attempt*, not the resulting photo (see
// IPhotoRepository.GetByClientUploadIdAsync, used to detect and no-op a retried upload).
public readonly record struct ClientUploadId(Guid Value) : IParsableId<ClientUploadId>
{
    public static implicit operator Guid(ClientUploadId id) => id.Value;
    public override string ToString() => Value.ToString();
    public static Result<ClientUploadId> Parse(string? raw) => IdParsing.Parse(raw, v => new ClientUploadId(v), "client upload id");
}
