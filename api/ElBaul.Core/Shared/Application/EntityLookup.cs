using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

namespace ElBaul.Core.Shared.Application;

public static class EntityLookup
{
    public static async Task<Result<TEntity>> ResolveAsync<TEntity>(
        Func<Task<TEntity?>> fetch,
        ILogger logger,
        string logMessage,
        string notFoundMessage,
        params object?[] logArgs)
        where TEntity : class =>
        await ResolveAsync(fetch, _ => true, logger, logMessage, notFoundMessage, logArgs);

    public static async Task<Result<TEntity>> ResolveAsync<TEntity>(
        Func<Task<TEntity?>> fetch,
        Func<TEntity, bool> matchesScope,
        ILogger logger,
        string logMessage,
        string notFoundMessage,
        params object?[] logArgs)
        where TEntity : class
    {
        var entity = await fetch();
        if (entity is not null && matchesScope(entity))
            return entity;

        logger.LogWarning(logMessage, logArgs);
        return Result.Failure<TEntity>(ApplicationError.NotFound(notFoundMessage));
    }
}
