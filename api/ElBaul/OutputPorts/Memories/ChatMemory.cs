using ElBaul.Domain;
namespace ElBaul.OutputPorts.Memories;
// Private, per-user chat memory — durable facts the chat has learned from a user's own
// messages within a single baúl, distinct from Recuerdo (baúl content, visible to the whole
// family). Never surfaced anywhere except that user's own "Gestionar memoria" screen and, as
// retrieval context, that user's own future chat turns in that same baúl — see
// ChatMemoryManager (CRUD, ownership-checked) and RelevantChatMemorySelector (retrieval).
public record ChatMemory
(
    ChatMemoryId Id,
    BaulId BaulId,
    UserId UserId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // The ChatMessage that produced (ADD) or last refined (UPDATE) this memory, kept for
    // debugging/traceability only — no UI surfaces it yet, and ChatMessage.Id is a bare Guid
    // (not a strongly-typed id), so this stays a bare Guid too rather than inventing one.
    Guid? SourceMessageId
)
{
    public ChatMemory WithContent(string content, DateTime updatedAt) =>
        this with { Content = content.Trim(), UpdatedAt = updatedAt };
}
