using ElBaul.InputPorts.Memories;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Memories;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// ChatMemoryExtractionManager only ever runs for a message going forward, enqueued as a
/// Hangfire job right when it's sent (see ChatManager.SendMessageAsync) — a message sent before
/// the chat memory feature existed, or while Features:ChatMemoryEnabled was still false, never
/// triggered extraction and never will on its own. This command catches those up, one time, by
/// replaying extraction for every such message through the exact same
/// IChatMemoryExtractionManager the live path uses.
///
/// Requires Features:ChatMemoryEnabled to already be true when this runs — same as the manager
/// itself would require to do anything (ExtractFromMessageAsync no-ops while it's off, so the
/// operator turns the feature on first, then runs this to fill in the backlog it left behind).
/// This command fails fast instead of quietly doing nothing if that isn't the case.
///
/// Safe to re-run, with one caveat: a message is skipped once it has produced at least one
/// ChatMemory (tracked via ChatMemory.SourceMessageId), so a re-run only retries messages that
/// produced nothing the first time — no different from how a live message is only ever
/// extracted once. That's a fine trade-off (extraction is idempotent-ish by construction: the
/// extractor is given the closest existing memories as context specifically to avoid
/// duplicating what's already known) but means a message that legitimately keeps producing
/// nothing costs an extraction call again on every re-run.
///
/// Processed oldest message first, globally, not grouped by (baúl, user) — a single ascending
/// pass preserves each conversation's own chronological order (all that ExtractFromMessageAsync
/// actually depends on, via RelevantChatMemorySelector's per-message dedup/correction context)
/// while staying a single flat loop.
/// </summary>
[MaintenanceCommand("backfill-chat-memories")]
public class BackfillChatMemoriesCommand(
    IChatMessageRepository chatMessageRepository,
    IChatMemoryRepository chatMemoryRepository,
    IChatMemoryExtractionManager chatMemoryExtractionManager,
    IAppConfiguration appConfiguration,
    ILogger<BackfillChatMemoriesCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        if (!appConfiguration.ChatMemoryEnabled)
        {
            logger.LogError(
                "backfill-chat-memories: Features:ChatMemoryEnabled is false — enable it first, " +
                "then re-run this command to backfill the messages sent before it was on.");
            return 1;
        }

        var messages = (await chatMessageRepository.GetAllAsync())
            .Where(m => m.Role == ChatMessageRole.User)
            .OrderBy(m => m.CreatedAt)
            .ToList();
        var alreadyExtracted = (await chatMemoryRepository.GetAllAsync())
            .Where(m => m.SourceMessageId.HasValue)
            .Select(m => m.SourceMessageId!.Value)
            .ToHashSet();

        var pending = messages.Where(m => !alreadyExtracted.Contains(m.Id)).ToList();

        logger.LogInformation(
            "backfill-chat-memories: {Total} user message(s) total, {Pending} pending extraction{DryRunSuffix}",
            messages.Count, pending.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var extracted = 0;
        var failed = 0;

        foreach (var message in pending)
        {
            if (dryRun)
            {
                logger.LogInformation(
                    "Would extract chat memories from message {ChatMessageId} (baúl {BaulId}, user {UserId})",
                    message.Id, message.BaulId, message.UserId);
                extracted++;
                continue;
            }

            try
            {
                var result = await chatMemoryExtractionManager.ExtractFromMessageAsync(
                    message.BaulId, message.UserId, message.Id, message.Content);
                if (result.IsFailure)
                {
                    failed++;
                    logger.LogError(
                        "Message {ChatMessageId} failed to extract, leaving it as-is: {Error}",
                        message.Id, result.Error);
                    continue;
                }

                extracted++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex, "Message {ChatMessageId} failed to extract, leaving it as-is", message.Id);
            }
        }

        logger.LogInformation(
            "backfill-chat-memories done. Extracted: {Extracted}, failed: {Failed}{DryRunSuffix}",
            extracted, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
