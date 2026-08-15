using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.OutputPorts;
public record Recuerdo
(
    RecuerdoId Id,
    PhotoId? PhotoId,
    ChapterId? ChapterId,
    BaulId BaulId,
    UserId UserId,
    string Text,
    DateTime CreatedAt
)
{
    public Recuerdo WithText(string text) =>
        this with { Text = text.Trim() };

    public Recuerdo WithoutChapter() =>
        this with { ChapterId = null };

    // Reassigns this recuerdo to a different photo — used by PhotoDuplicateMergeService to move
    // every duplicate's memories/comments onto the survivor without recreating them.
    public Recuerdo ForPhoto(PhotoId photoId) =>
        this with { PhotoId = photoId };
}
