using ElBaul.InputPorts.Memories;
using Serilog.Context;

using ElBaul.Domain;
namespace ElBaul.Infra.Memories;

/// <summary>
/// The actual Hangfire-invoked entry point for memory extraction — HangfireBackgroundJobScheduler
/// enqueues this instead of IChatMemoryExtractionManager.ExtractFromMessageAsync directly, same
/// shape as EmailJobs (see that class's doc comment for why: Core never references Hangfire).
///
/// Unlike EmailJobs, this one is NOT [DisableConcurrentExecution] — that attribute serializes
/// every job of a given (Type, Method) globally, which EmailJobs needs to respect Resend's
/// shared rate limit. Extraction has no such shared external constraint, and different users'
/// (or different baúles') extractions are otherwise fully independent, so serializing them all
/// globally would only add latency for no correctness benefit.
///
/// Own log correlation boundary, same reasoning as EmailJobs: a Hangfire job has no HTTP
/// request for UserLogContextMiddleware to run against.
/// </summary>
public class ChatMemoryExtractionJobs(IChatMemoryExtractionManager chatMemoryExtractionManager)
{
    public async Task ExtractAsync(Guid baulId, string userId, Guid sourceMessageId, string text)
    {
        using (LogContext.PushProperty("UserId", userId))
            await chatMemoryExtractionManager.ExtractFromMessageAsync(new BaulId(baulId), new UserId(userId), sourceMessageId, text);
    }
}
