using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class InMemoryAdminRepository : IAdminRepository
{
    public AdminDashboardCounts DashboardCounts { get; set; } = new(0, 0, 0, 0);
    public DateTime? LastRequestedTodayUtcStart { get; private set; }

    public List<AdminUserRow> Users { get; } = [];
    public Dictionary<string, AdminUserDetailRow> UserDetails { get; } = new();

    public List<AdminBaulRow> Baules { get; } = [];
    public Dictionary<BaulId, AdminBaulDetailRow> BaulDetails { get; } = new();

    public Task<AdminDashboardCounts> GetDashboardCountsAsync(DateTime todayUtcStart)
    {
        LastRequestedTodayUtcStart = todayUtcStart;
        return Task.FromResult(DashboardCounts);
    }

    public Task<IEnumerable<AdminUserRow>> GetAllUsersAsync() =>
        Task.FromResult<IEnumerable<AdminUserRow>>(Users);

    public Task<AdminUserDetailRow?> GetUserDetailAsync(string userId) =>
        Task.FromResult(UserDetails.GetValueOrDefault(userId));

    public Task<IEnumerable<AdminBaulRow>> GetAllBaulesAsync() =>
        Task.FromResult<IEnumerable<AdminBaulRow>>(Baules);

    public Task<AdminBaulDetailRow?> GetBaulDetailAsync(BaulId baulId) =>
        Task.FromResult(BaulDetails.GetValueOrDefault(baulId));
}
