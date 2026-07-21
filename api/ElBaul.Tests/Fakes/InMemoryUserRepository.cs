using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<string, User> _users = new();

    public Task<User?> GetByIdAsync(string id) =>
        Task.FromResult(_users.GetValueOrDefault(id));

    public Task<User?> GetByEmailAsync(string email) =>
        Task.FromResult(_users.Values.FirstOrDefault(u => u.Email == email));

    public Task<IEnumerable<User>> GetUsersRegisteredBeforeAsync(DateTime cutoff) =>
        Task.FromResult(_users.Values.Where(u => u.CreatedAt <= cutoff));

    public Task<IEnumerable<User>> GetUsersWithDigestEnabledAsync() =>
        Task.FromResult(_users.Values.Where(u => u.WeeklyDigestEnabled));

    public Task UpsertAsync(User user)
    {
        _users[user.Id] = user;
        return Task.CompletedTask;
    }

    public Task UpdateLastAccessAsync(string id, DateTime at)
    {
        if (_users.TryGetValue(id, out var user))
        {
            _users[id] = user with { LastAccessAt = at };
        }
        return Task.CompletedTask;
    }

    public Task UpdateWeeklyDigestEnabledAsync(string id, bool enabled)
    {
        if (_users.TryGetValue(id, out var user))
        {
            _users[id] = user with { WeeklyDigestEnabled = enabled };
        }
        return Task.CompletedTask;
    }

    public void Seed(User user) => _users[user.Id] = user;
}
