using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.Domain;
public sealed class Recuerdo : Entity<RecuerdoId>
{
    public PhotoId? PhotoId { get; private set; }
    public ChapterId? ChapterId { get; private set; }
    public BaulId BaulId { get; private set; }
    public UserId UserId { get; private set; }
    public string Text { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public Recuerdo(
    RecuerdoId Id,
    PhotoId? PhotoId,
    ChapterId? ChapterId,
    BaulId BaulId,
    UserId UserId,
    string Text,
    DateTime CreatedAt) : base(Id)
    {
        this.PhotoId = PhotoId; this.ChapterId = ChapterId; this.BaulId = BaulId;
        this.UserId = UserId; this.Text = Text; this.CreatedAt = CreatedAt;
    }
    public Recuerdo WithText(string text) =>
        Mutate(() => Text = text.Trim());

    public Recuerdo WithoutChapter() =>
        Mutate(() => ChapterId = null);

    // Reassigns this recuerdo to a different photo — used by PhotoDuplicateMergeService to move
    // every duplicate's memories/comments onto the survivor without recreating them.
    public Recuerdo ForPhoto(PhotoId photoId) =>
        Mutate(() => PhotoId = photoId);

    public Recuerdo ForBaul(BaulId baulId) =>
        Mutate(() => BaulId = baulId);

    private Recuerdo Mutate(Action action) { action(); return this; }
}
