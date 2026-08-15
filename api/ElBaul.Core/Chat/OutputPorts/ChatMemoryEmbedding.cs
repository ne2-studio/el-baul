using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
// BaulId/UserId are redundant with the ChatMemory row this belongs to (1:1, see
// ChatMemoryEmbeddingConfiguration), carried here anyway so retrieval can scope its query to
// (BaulId, UserId) directly — same reasoning as RecuerdoEmbedding.BaulId.
public record ChatMemoryEmbedding
(
    ChatMemoryId ChatMemoryId,
    BaulId BaulId,
    UserId UserId,
    float[] Vector,
    string Model,
    DateTime CreatedAt
);
