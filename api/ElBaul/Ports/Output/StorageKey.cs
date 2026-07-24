namespace ElBaul.Ports.Output;

// The object-storage key a photo or persona avatar is saved under. Two related but distinct
// shapes exist ("{userId}/{guid}-{fileName}" for photos, "personas/{personaId}/{guid}-
// {fileName}" for persona avatars) — both share the same "last path segment ends in
// {36-char guid}-{originalFileName}" convention, which OriginalFileName parses back off,
// replacing the magic-number substring extraction that used to live in PhotoManager.
public readonly record struct StorageKey
{
    private const int GuidAndDashLength = 37;

    public string Value { get; }

    private StorageKey(string value) => Value = value;

    public static StorageKey ForPhoto(string userId, Guid id, string fileName) =>
        new($"{userId}/{id}-{fileName}");

    public static StorageKey ForPersonaAvatar(Guid personaId, Guid id, string fileName) =>
        new($"personas/{personaId}/{id}-{fileName}");

    // Wraps an already-persisted key (loaded as plain string from Photo.StorageKey) so
    // OriginalFileName can be read off it — not for building new keys, see ForPhoto/
    // ForPersonaAvatar for that.
    public static StorageKey From(string value) => new(value);

    public string OriginalFileName
    {
        get
        {
            var lastSegment = Value[(Value.LastIndexOf('/') + 1)..];
            return lastSegment.Length > GuidAndDashLength ? lastSegment[GuidAndDashLength..] : lastSegment;
        }
    }

    public static implicit operator string(StorageKey key) => key.Value;

    public override string ToString() => Value;
}
