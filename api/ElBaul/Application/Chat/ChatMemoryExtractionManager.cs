using ElBaul.Application.Chat;
using ElBaul.InputPorts.Chat;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Chat;
// Runs entirely off the critical path — see IBackgroundJobScheduler.EnqueueChatMemoryExtraction
// and ChatManager.SendMessageAsync, which enqueues this after replying instead of awaiting it.
// Every failure here (extraction, embedding, persistence) is logged and swallowed at the
// operation level so one bad memory never sinks the rest of the batch; the method itself still
// returns Result so a total extraction failure (backend down entirely) surfaces to Hangfire's
// own retry policy, which is what actually recovers from that case — not this manager retrying
// itself.
public class ChatMemoryExtractionManager(
    ILogger<ChatMemoryExtractionManager> logger,
    IAppConfiguration appConfiguration,
    IChatMemoryRepository chatMemoryRepository,
    IChatMemoryEmbeddingRepository chatMemoryEmbeddingRepository,
    IChatMemoryExtractionBackend extractionBackend,
    IEmbeddingBackend embeddingBackend,
    IRelevantChatMemorySelector relevantChatMemorySelector,
    IIdGenerator idGenerator,
    IClock clock) : IChatMemoryExtractionManager
{
    public async Task<Result> ExtractFromMessageAsync(BaulId baulId, UserId userId, Guid sourceMessageId, string text)
    {
        if (!appConfiguration.ChatMemoryEnabled) return Result.Success();

        // Existing memories closest to this message double as both "don't duplicate what we
        // already know" and "here's what might need correcting" context for the extractor.
        var similar = await relevantChatMemorySelector.SelectAsync(baulId, userId, text);
        var existingForExtraction = similar.Select(m => new ExistingMemoryForExtraction(m.Id.ToString(), m.Content)).ToList();

        var extractionResult = await extractionBackend.ExtractAsync(text, existingForExtraction);
        if (extractionResult.IsFailure)
        {
            logger.LogWarning("Chat memory extraction failed {BaulId} {Error}", baulId, extractionResult.Error);
            return Result.Failure(extractionResult.Error);
        }

        var operations = extractionResult.Value;
        var addCount = 0;
        var updateCount = 0;

        foreach (var operation in operations)
        {
            if (string.IsNullOrWhiteSpace(operation.Content)) continue;

            var existing = await ResolveExistingAsync(operation, baulId, userId);
            if (existing is not null)
            {
                await UpdateAsync(existing, operation.Content);
                updateCount++;
            }
            else
            {
                await CreateAsync(baulId, userId, sourceMessageId, operation.Content);
                addCount++;
            }
        }

        logger.LogInformation(
            "Chat memory extraction completed {BaulId} operations={Operations} add={Add} update={Update}",
            baulId, operations.Count, addCount, updateCount);

        return Result.Success();
    }

    // An UPDATE with an id the extractor invented, or one that (somehow) belongs to a
    // different baúl/user, falls back to ADD instead of dropping the fact entirely — a
    // model mistake here shouldn't cost the user the information they just gave us.
    private async Task<ChatMemory?> ResolveExistingAsync(ChatMemoryOperation operation, BaulId baulId, UserId userId)
    {
        if (operation.Type != ChatMemoryOperationType.Update || operation.ExistingMemoryId is not { } rawId)
            return null;

        var parsed = ChatMemoryId.Parse(rawId);
        if (parsed.IsFailure) return null;

        var existing = await chatMemoryRepository.GetByIdAsync(parsed.Value);
        return existing is not null && existing.BaulId == baulId && existing.UserId == userId ? existing : null;
    }

    private async Task CreateAsync(BaulId baulId, UserId userId, Guid sourceMessageId, string content)
    {
        var now = clock.UtcNow();
        var memory = new ChatMemory(new ChatMemoryId(idGenerator.NewId()), baulId, userId, content.Trim(), now, now, sourceMessageId);
        await chatMemoryRepository.CreateAsync(memory);
        await EmbedAndStoreAsync(memory);
    }

    private async Task UpdateAsync(ChatMemory existing, string content)
    {
        var updated = existing.WithContent(content, clock.UtcNow());
        await chatMemoryRepository.UpdateAsync(updated);
        await EmbedAndStoreAsync(updated);
    }

    private async Task EmbedAndStoreAsync(ChatMemory memory)
    {
        var embedResult = await embeddingBackend.EmbedAsync(memory.Content);
        if (embedResult.IsFailure)
        {
            // The memory itself is still saved without an embedding — RelevantChatMemorySelector
            // simply excludes it from ranking until a later edit regenerates one.
            logger.LogWarning("Could not embed chat memory {ChatMemoryId} {Error}", memory.Id, embedResult.Error);
            return;
        }

        await chatMemoryEmbeddingRepository.UpsertAsync(
            new ChatMemoryEmbedding(memory.Id, memory.BaulId, memory.UserId, embedResult.Value, embeddingBackend.ModelId, clock.UtcNow()));
    }
}
