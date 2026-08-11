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
/// Not every write path goes through this port. The transaction boundary should match a real
/// business invariant/atomic operation, not default to "the whole manager method" — see the doc
/// comments on BaulInviteLinkManager.GetOrCreateAsync/RegenerateAsync, UserRepository.UpsertAsync,
/// EmailLinkClickRepository.RegisterSignedClickAsync, ChatManager.SendMessageAsync, and
/// EmailDeliveryCoordinator.SendAsync for the deliberate exceptions and why. Two of those reasons
/// are worth calling out explicitly because they're easy to get wrong:
/// - The three race-detection repositories above don't avoid this port merely because a lost
///   race throws a catchable exception — a caught .NET exception does NOT mean the underlying
///   Postgres transaction is still usable. A failed statement inside an explicit transaction
///   poisons the whole transaction (SQLSTATE 25P02, "current transaction is aborted") until it
///   rolls back, regardless of whether the exception was caught. They're written as a native
///   `INSERT ... ON CONFLICT` instead, which never raises that error in the first place.
/// - ChatManager.SendMessageAsync isn't excluded because of read-your-own-writes concerns — a
///   transaction can always see its own prior writes. It's excluded because the two writes
///   sandwich a slow, external LLM call, and a real DB transaction must never sit open across
///   I/O like that.
/// </summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken ct = default);

    Task<Result> ExecuteInTransactionAsync(Func<Task<Result>> operation, CancellationToken ct = default);

    Task<Result<T>> ExecuteInTransactionAsync<T>(Func<Task<Result<T>>> operation, CancellationToken ct = default);
}
