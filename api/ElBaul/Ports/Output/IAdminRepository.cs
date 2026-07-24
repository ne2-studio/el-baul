namespace ElBaul.Ports.Output;

/// <summary>
/// Cross-aggregate, unscoped read queries for the backoffice — dashboard KPIs and the
/// Usuarios/Baúles list/detail screens. Every other repository in this codebase is built
/// around single-aggregate, per-user-scoped access (consumed by ICurrentUserProvider-scoped
/// managers); admin queries are neither, so they don't belong bolted onto those contracts.
/// </summary>
public interface IAdminRepository
{
    Task<AdminDashboardCounts> GetDashboardCountsAsync(DateTime todayUtcStart);
    Task<IEnumerable<AdminUserRow>> GetAllUsersAsync();
    Task<AdminUserDetailRow?> GetUserDetailAsync(string userId);
    Task<IEnumerable<AdminBaulRow>> GetAllBaulesAsync();
    Task<AdminBaulDetailRow?> GetBaulDetailAsync(BaulId baulId);
}
