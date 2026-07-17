using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class ElBaulDbContext(DbContextOptions<ElBaulDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Baul> Baules => Set<Baul>();
    public DbSet<Album> Albums => Set<Album>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<Recuerdo> Recuerdos => Set<Recuerdo>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<SharedUser> SharedUsers => Set<SharedUser>();
    public DbSet<RemovalRequest> RemovalRequests => Set<RemovalRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ElBaulDbContext).Assembly);
    }
}
