using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Chat.Application;
public class ChatMemoryManager(
    ILogger<ChatMemoryManager> logger,
    IChatMemoryRepository chatMemoryRepository,
    IChatMemoryEmbeddingRepository chatMemoryEmbeddingRepository,
    IEmbeddingBackend embeddingBackend,
    IAppConfiguration appConfiguration,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IUnitOfWork unitOfWork) : IChatMemoryManager
{
    public async Task<Result<IEnumerable<ChatMemoryDto>>> GetMemoriesAsync(BaulId baulId)
    {
        if (!appConfiguration.ChatMemoryEnabled)
            return Result.Failure<IEnumerable<ChatMemoryDto>>(ApplicationError.Validation("Chat memory is not enabled"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chat memory list");
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChatMemoryDto>>(auth.Error);

        var memories = await chatMemoryRepository.GetByBaulAndUserAsync(baulId, userId);
        return Result.Success(memories.OrderByDescending(m => m.UpdatedAt).Select(ToDto));
    }

    public async Task<Result<ChatMemoryDto>> UpdateMemoryAsync(ChatMemoryId chatMemoryId, string content)
    {
        if (!appConfiguration.ChatMemoryEnabled)
            return Result.Failure<ChatMemoryDto>(ApplicationError.Validation("Chat memory is not enabled"));
        if (string.IsNullOrWhiteSpace(content))
            return Result.Failure<ChatMemoryDto>(ApplicationError.Validation("Content is required"));

        var access = await AuthorizeOwnAsync(chatMemoryId, "Chat memory update");
        if (access.IsFailure) return Result.Failure<ChatMemoryDto>(access.Error);
        var memory = access.Value;

        // Embed first, write second: a failed embed call must leave the memory exactly as it
        // was rather than persisting new text next to a stale (or missing) vector — there's no
        // background backfill for chat memories the way there is for recuerdos, so a memory
        // stuck without a fresh embedding would silently stop being retrievable.
        var embedResult = await embeddingBackend.EmbedAsync(content);
        if (embedResult.IsFailure)
        {
            logger.LogWarning("Chat memory update rejected: embedding failed {ChatMemoryId} {Error}", chatMemoryId, embedResult.Error);
            return Result.Failure<ChatMemoryDto>(embedResult.Error);
        }

        var updated = memory.WithContent(content, clock.UtcNow());
        await chatMemoryRepository.UpdateAsync(updated);
        await chatMemoryEmbeddingRepository.UpsertAsync(
            new ChatMemoryEmbedding(updated.Id, updated.BaulId, updated.UserId, embedResult.Value, embeddingBackend.ModelId, clock.UtcNow()));

        logger.LogInformation("Chat memory updated {ChatMemoryId}", updated.Id);
        return ToDto(updated);
    }

    public async Task<Result> DeleteMemoryAsync(ChatMemoryId chatMemoryId)
    {
        if (!appConfiguration.ChatMemoryEnabled)
            return Result.Failure(ApplicationError.Validation("Chat memory is not enabled"));

        var access = await AuthorizeOwnAsync(chatMemoryId, "Chat memory deletion");
        if (access.IsFailure) return Result.Failure(access.Error);

        // Both repositories bulk-delete via ExecuteDeleteAsync (bypasses the change tracker),
        // so only an ambient transaction makes the memory and its embedding disappear together
        // — see IUnitOfWork's doc comment.
        return await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await chatMemoryRepository.DeleteAsync(chatMemoryId);
            await chatMemoryEmbeddingRepository.DeleteAsync(chatMemoryId);
            return Result.Success();
        });
    }

    // Every entry point resolves down to this: a memory belongs to whichever user's messages
    // it was extracted from, and baúl membership alone is never enough to read/edit/delete it
    // — mirrors RecuerdoManager's "only the author can edit" rule, just applied to every
    // operation instead of only Update.
    private async Task<Result<ChatMemory>> AuthorizeOwnAsync(ChatMemoryId chatMemoryId, string operation)
    {
        var userId = currentUserProvider.GetUserId();
        var memory = await chatMemoryRepository.GetByIdAsync(chatMemoryId);
        if (memory is null)
            return Result.Failure<ChatMemory>(ApplicationError.NotFound("Chat memory not found"));

        var auth = await baulAccess.AuthorizeAsync(
            memory.BaulId, userId, AccessLevel.Member, operation, new { memory.BaulId, ChatMemoryId = chatMemoryId });
        if (auth.IsFailure) return Result.Failure<ChatMemory>(auth.Error);

        if (memory.UserId != userId)
        {
            logger.LogWarning("{Operation} rejected: not the memory's owner {ChatMemoryId}", operation, chatMemoryId);
            return Result.Failure<ChatMemory>(ApplicationError.Forbidden("Only the owner can access this memory"));
        }

        return Result.Success(memory);
    }

    private static ChatMemoryDto ToDto(ChatMemory memory) =>
        new(memory.Id.ToString(), memory.Content, memory.CreatedAt, memory.UpdatedAt);
}
