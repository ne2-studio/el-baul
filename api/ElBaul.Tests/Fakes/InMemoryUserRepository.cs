using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryUserRepository : IUserRepository
{
    private readonly Dictionary<string, User> _users = new();

    public Task<User?> GetByIdAsync(string id) =>
        Task.FromResult(_users.GetValueOrDefault(id));

    public Task<User?> GetByEmailAsync(string email) =>
        Task.FromResult(_users.Values.FirstOrDefault(u => u.Email == email));

    public Task UpsertAsync(User user)
    {
        _users[user.Id] = user;
        return Task.CompletedTask;
    }

    public void Seed(User user) => _users[user.Id] = user;
}
