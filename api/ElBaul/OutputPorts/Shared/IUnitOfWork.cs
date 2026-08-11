using Ne2Studio.Common;

namespace ElBaul.OutputPorts.Shared;

/// <summary>
/// The commit boundary for a manager method that stages 2+ writes across one or more
/// repositories sharing the same request-scoped DbContext. Repositories only stage changes
/// (Add/Update on the change tracker) — they no longer call SaveChanges themselves — so a
/// manager decides, explicitly, when its unit of work is done.
///
/// Two shapes, for two different failure modes:
/// - <see cref="SaveChangesAsync"/>: one commit at the end of a method whose writes only ever
///   go through the change tracker. Cheapest option — use it whenever it applies.
/// - <see cref="ExecuteInTransactionAsync{T}"/>: wraps the whole operation in a real database
///   transaction. Required whenever any repository call in the method uses
///   ExecuteDeleteAsync/ExecuteUpdateAsync — those bypass the change tracker and commit
///   immediately on their own, so batching SaveChanges around them does nothing; only an
///   ambient transaction makes them atomic with the rest of the method. The implementation
///   flushes any tracked (Add/Update) changes before committing, so `operation` itself never
///   needs to call <see cref="SaveChangesAsync"/>.
///
/// Not every write path goes through this port — see the doc comments on
/// BaulInviteLinkManager.GetOrCreateAsync/RegenerateAsync, ChatManager.SendMessageAsync, and
/// EmailDeliveryCoordinator.SendAsync for the deliberate exceptions and why.
/// </summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct = default);

    Task<Result> ExecuteInTransactionAsync(Func<Task<Result>> operation, CancellationToken ct = default);

    Task<Result<T>> ExecuteInTransactionAsync<T>(Func<Task<Result<T>>> operation, CancellationToken ct = default);
}
