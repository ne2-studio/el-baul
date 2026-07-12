using Dapper;
using Npgsql;
using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

public class PostgresTaskRepository(string connectionString) : ITaskRepository
{
    public async Task SaveAsync(TaskItem task)
    {
        using var connection = new NpgsqlConnection(connectionString);
        var sql = @"
            INSERT INTO ""Tasks"" (""Id"", ""UserId"", ""Title"", ""CreatedAt"")
            VALUES (@Id, @UserId, @Title, @CreatedAt)";

        await connection.ExecuteAsync(sql, new
        {
            task.Id,
            task.UserId,
            task.Title,
            task.CreatedAt
        });
    }

    public async Task DeleteAsync(Guid id, string userId)
    {
        using var connection = new NpgsqlConnection(connectionString);
        await connection.ExecuteAsync(
            "DELETE FROM \"Tasks\" WHERE \"Id\" = @Id AND \"UserId\" = @UserId",
            new { Id = id, UserId = userId });
    }

    public async Task<TaskItem?> LoadByIdAsync(Guid id, string userId)
    {
        using var connection = new NpgsqlConnection(connectionString);
        var sql = @"
            SELECT ""Id"", ""UserId"", ""Title"", ""CreatedAt""
            FROM ""Tasks""
            WHERE ""Id"" = @Id AND ""UserId"" = @UserId";

        return await connection.QuerySingleOrDefaultAsync<TaskItem>(sql, new { Id = id, UserId = userId });
    }

    public async Task<IEnumerable<TaskItem>> ListAsync(string userId, int skip = 0, int take = 10)
    {
        using var connection = new NpgsqlConnection(connectionString);
        var sql = @"
            SELECT ""Id"", ""UserId"", ""Title"", ""CreatedAt""
            FROM ""Tasks""
            WHERE ""UserId"" = @UserId
            ORDER BY ""CreatedAt"" DESC
            LIMIT @Take OFFSET @Skip";

        return await connection.QueryAsync<TaskItem>(sql, new { UserId = userId, Skip = skip, Take = take });
    }
}
