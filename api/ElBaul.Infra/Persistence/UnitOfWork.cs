using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

namespace ElBaul.Infra.Persistence;

public class UnitOfWork(ElBaulDbContext dbContext) : IUnitOfWork
{
    public Task SaveChangesAsync(CancellationToken ct = default) => dbContext.SaveChangesAsync(ct);

    public async Task<Result> ExecuteInTransactionAsync(Func<Task<Result>> operation, CancellationToken ct = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            var result = await operation();
            if (result.IsFailure)
            {
                await transaction.RollbackAsync(ct);
                return result;
            }

            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<Result<T>> ExecuteInTransactionAsync<T>(Func<Task<Result<T>>> operation, CancellationToken ct = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            var result = await operation();
            if (result.IsFailure)
            {
                await transaction.RollbackAsync(ct);
                return result;
            }

            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }
}
