using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Chat.InputPorts;
// User-facing memory CRUD ("Gestionar memoria") — creation is deliberately absent: memories
// are only ever produced by the automatic extraction pipeline (IChatMemoryExtractionManager),
// never by a manual "add memory" UI action, per the current scope.
public interface IChatMemoryManager
{
    Task<Result<IEnumerable<ChatMemoryDto>>> GetMemoriesAsync(BaulId baulId);
    Task<Result<ChatMemoryDto>> UpdateMemoryAsync(ChatMemoryId chatMemoryId, string content);
    Task<Result> DeleteMemoryAsync(ChatMemoryId chatMemoryId);
}
