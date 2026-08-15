using ElBaul.Domain;
using ElBaul.Core.Users.OutputPorts;
namespace ElBaul.Infra.Lite;

// Registered as a Singleton (see ServiceRegistration.AddLiteInfrastructure) so state survives
// across requests — unlike ElBaul.Tests, where this class is exercised single-threadedly, a
// live ASP.NET Core app fires genuinely concurrent requests at it (confirmed: an unguarded
// Dictionary here corrupted its internal state and crashed under real concurrent traffic from
// app/acceptance-tests' Playwright run). Every method locks around the read/write and
// materializes (.ToList()) any LINQ query before returning it, since a lazily-evaluated
// IEnumerable would otherwise enumerate the live dictionary outside the lock.
public class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<UserId, User> _users = new();
    private readonly Lock _lock = new();

    public Task<User?> GetByIdAsync(UserId id)
    {
        lock (_lock) return Task.FromResult(_users.GetValueOrDefault(id));
    }

    public Task<IEnumerable<User>> GetByIdsAsync(IEnumerable<UserId> ids)
    {
        var idSet = ids.ToHashSet();
        lock (_lock) return Task.FromResult(_users.Values.Where(u => idSet.Contains(u.Id)).ToList().AsEnumerable());
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

    public Task UpdateLastAccessAsync(UserId id, DateTime at)
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

    public Task UpdateWeeklyDigestEnabledAsync(UserId id, bool enabled)
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

    public Task UpdateLastPushDigestSentAtAsync(UserId id, DateTime at)
    {
        lock (_lock)
        {
            if (_users.TryGetValue(id, out var user))
            {
                _users[id] = user with { LastPushDigestSentAt = at };
            }
        }
        return Task.CompletedTask;
    }

    public Task MarkOnboardingSeenAsync(UserId id)
    {
        lock (_lock)
        {
            if (_users.TryGetValue(id, out var user))
            {
                _users[id] = user with { HasSeenOnboarding = true };
            }
        }
        return Task.CompletedTask;
    }

    public void Seed(User user)
    {
        lock (_lock) _users[user.Id] = user;
    }
}
