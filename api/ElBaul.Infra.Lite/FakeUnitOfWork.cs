using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

namespace ElBaul.Infra.Lite;

/// <summary>
/// A deliberate, documented divergence from ElBaul.Infra's real UnitOfWork: the in-memory
/// repositories behind el-baul-api-lite mutate their shared singleton collections synchronously
/// and immediately on every Add/Update/Delete call — there is no change tracker to flush and no
/// database transaction to open, so there is nothing to defer or roll back. SaveChangesAsync is
/// therefore a no-op, and ExecuteInTransactionAsync just runs the operation — if it fails partway
/// through, whatever it already wrote to the in-memory repositories stays written. Tests that
/// need to prove real rollback-on-failure belong in ElBaul.Infra.PersistenceTests against real
/// Postgres, not against Lite (see that project's README.md).
/// </summary>
public class FakeUnitOfWork : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

    public Task<Result> ExecuteInTransactionAsync(Func<Task<Result>> operation, CancellationToken ct = default) =>
        operation();

    public Task<Result<T>> ExecuteInTransactionAsync<T>(Func<Task<Result<T>>> operation, CancellationToken ct = default) =>
        operation();
}
