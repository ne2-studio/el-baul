using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Chat.InputPorts;
// The write side of the extraction pipeline — invoked from a background job (see
// IBackgroundJobScheduler.EnqueueChatMemoryExtraction), never from the request that sends a
// chat message, so a failure here never fails the chat reply itself.
public interface IChatMemoryExtractionManager
{
    Task<Result> ExtractFromMessageAsync(BaulId baulId, UserId userId, Guid sourceMessageId, string text);
}
