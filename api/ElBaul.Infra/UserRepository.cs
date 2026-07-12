using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class UserRepository(ElBaulDbContext dbContext) : IUserRepository
{
    public Task<User?> GetByIdAsync(string id) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByEmailAsync(string email) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

    public async Task UpsertAsync(User user)
    {
        var existing = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
        if (existing is null)
        {
            dbContext.Users.Add(user);
        }
        else
        {
            dbContext.Entry(existing).CurrentValues.SetValues(user with { CreatedAt = existing.CreatedAt });
        }

        await dbContext.SaveChangesAsync();
    }
}
