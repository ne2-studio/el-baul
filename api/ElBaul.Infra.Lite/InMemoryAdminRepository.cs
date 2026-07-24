using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// Users/Baules/UserDetails/BaulDetails are public and directly mutable — nothing in
// el-baul-api-lite's live request pipeline ever writes to them (IAdminRepository has no write
// methods; this fake only ever gets populated by a test calling .Add()/the indexer directly
// during setup, same as ElBaul.Tests' AdminManagerTests does), so unlike the other
// InMemory*Repository classes there's no live read/write race to guard against here — only
// the read methods lock, for consistency and in case that ever changes.
public class InMemoryAdminRepository : IAdminRepository
{
    private readonly Lock _lock = new();

    public AdminDashboardCounts DashboardCounts { get; set; } = new(0, 0, 0, 0);
    public DateTime? LastRequestedTodayUtcStart { get; private set; }

    public List<AdminUserRow> Users { get; } = [];
    public Dictionary<string, AdminUserDetailRow> UserDetails { get; } = new();

    public List<AdminBaulRow> Baules { get; } = [];
    public Dictionary<BaulId, AdminBaulDetailRow> BaulDetails { get; } = new();

    public Task<AdminDashboardCounts> GetDashboardCountsAsync(DateTime todayUtcStart)
    {
        lock (_lock)
        {
            LastRequestedTodayUtcStart = todayUtcStart;
            return Task.FromResult(DashboardCounts);
        }
    }

    public Task<IEnumerable<AdminUserRow>> GetAllUsersAsync()
    {
        lock (_lock) return Task.FromResult<IEnumerable<AdminUserRow>>(Users.ToList());
    }

    public Task<AdminUserDetailRow?> GetUserDetailAsync(string userId)
    {
        lock (_lock) return Task.FromResult(UserDetails.GetValueOrDefault(userId));
    }

    public Task<IEnumerable<AdminBaulRow>> GetAllBaulesAsync()
    {
        lock (_lock) return Task.FromResult<IEnumerable<AdminBaulRow>>(Baules.ToList());
    }

    public Task<AdminBaulDetailRow?> GetBaulDetailAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(BaulDetails.GetValueOrDefault(baulId));
    }
}
