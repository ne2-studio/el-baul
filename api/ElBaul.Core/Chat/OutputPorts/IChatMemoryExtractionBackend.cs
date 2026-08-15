using Ne2Studio.Common;

namespace ElBaul.OutputPorts.Chat;

/// <summary>An existing memory offered to the extractor as dedup/update context — see
/// ChatMemoryExtractionManager, which fetches these via RelevantChatMemorySelector before
/// calling ExtractAsync.</summary>
public record ExistingMemoryForExtraction(string Id, string Content);

public enum ChatMemoryOperationType { Add, Update }

/// <summary>ExistingMemoryId is only meaningful (and only ever set) for Update.</summary>
public record ChatMemoryOperation(ChatMemoryOperationType Type, string Content, string? ExistingMemoryId);

// Secondary port for whichever LLM call turns a single user chat message into zero or more
// memory operations (currently OpenAI, see ElBaul.Infra/Memories/OpenAiChatMemoryExtractionBackend).
// Kept separate from IAiChatBackend since this one is constrained to structured output (a fixed
// JSON schema), not a free-text reply — see that class for the request shape.
public interface IChatMemoryExtractionBackend
{
    Task<Result<IReadOnlyList<ChatMemoryOperation>>> ExtractAsync(
        string userMessage, IReadOnlyList<ExistingMemoryForExtraction> similarMemories);
}
