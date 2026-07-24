using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// Registered as a Singleton (see ServiceRegistration.AddLiteInfrastructure) so state survives
// across requests — unlike ElBaul.Tests, where this class is exercised single-threadedly, a
// live ASP.NET Core app fires genuinely concurrent requests at it (confirmed: an unguarded
// Dictionary here corrupted its internal state and crashed under real concurrent traffic from
// app/e2e-image-acceptance's Playwright run). Every method locks around the read/write and
// materializes (.ToList()) any LINQ query before returning it, since a lazily-evaluated
// IEnumerable would otherwise enumerate the live dictionary outside the lock.
public class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<string, User> _users = new();
    private readonly Lock _lock = new();

    public Task<User?> GetByIdAsync(string id)
    {
        lock (_lock) return Task.FromResult(_users.GetValueOrDefault(id));
    }

    public Task<User?> GetByEmailAsync(string email)
    {
        lock (_lock) return Task.FromResult(_users.Values.FirstOrDefault(u => u.Email == email));
    }

    public Task<IEnumerable<User>> GetUsersRegisteredBeforeAsync(DateTime cutoff)
    {
        lock (_lock) return Task.FromResult(_users.Values.Where(u => u.CreatedAt <= cutoff).ToList().AsEnumerable());
    }

    public Task<IEnumerable<User>> GetUsersWithDigestEnabledAsync()
    {
        lock (_lock) return Task.FromResult(_users.Values.Where(u => u.WeeklyDigestEnabled).ToList().AsEnumerable());
    }

    public Task UpsertAsync(User user)
    {
        lock (_lock) _users[user.Id] = user;
        return Task.CompletedTask;
    }

    public Task UpdateLastAccessAsync(string id, DateTime at)
    {
        lock (_lock)
        {
            if (_users.TryGetValue(id, out var user))
            {
                _users[id] = user with { LastAccessAt = at };
            }
        }
        return Task.CompletedTask;
    }

    public Task UpdateWeeklyDigestEnabledAsync(string id, bool enabled)
    {
        lock (_lock)
        {
            if (_users.TryGetValue(id, out var user))
            {
                _users[id] = user with { WeeklyDigestEnabled = enabled };
            }
        }
        return Task.CompletedTask;
    }

    public void Seed(User user)
    {
        lock (_lock) _users[user.Id] = user;
    }
}
