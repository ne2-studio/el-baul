using ElBaul.Domain;
namespace ElBaul.Core.Chat.Domain;
// Private, per-user chat memory — durable facts the chat has learned from a user's own
// messages within a single baúl, distinct from Recuerdo (baúl content, visible to the whole
// family). Never surfaced anywhere except that user's own "Gestionar memoria" screen and, as
// retrieval context, that user's own future chat turns in that same baúl — see
// ChatMemoryManager (CRUD, ownership-checked) and RelevantChatMemorySelector (retrieval).
public sealed class ChatMemory : Entity<ChatMemoryId>
{
    public BaulId BaulId { get; private set; }
    public UserId UserId { get; private set; }
    public string Content { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public Guid? SourceMessageId { get; private set; }

    public ChatMemory(
    ChatMemoryId Id,
    BaulId BaulId,
    UserId UserId,
    string Content,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // The ChatMessage that produced (ADD) or last refined (UPDATE) this memory, kept for
    // debugging/traceability only — no UI surfaces it yet, and ChatMessage.Id is a bare Guid
    // (not a strongly-typed id), so this stays a bare Guid too rather than inventing one.
    Guid? SourceMessageId) : base(Id)
    {
        this.BaulId = BaulId; this.UserId = UserId; this.Content = Content;
        this.CreatedAt = CreatedAt; this.UpdatedAt = UpdatedAt; this.SourceMessageId = SourceMessageId;
    }
    public ChatMemory WithContent(string content, DateTime updatedAt)
    {
        Content = content.Trim(); UpdatedAt = updatedAt; return this;
    }
}
