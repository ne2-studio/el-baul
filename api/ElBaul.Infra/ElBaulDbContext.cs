using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class ElBaulDbContext(DbContextOptions<ElBaulDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Baul> Baules => Set<Baul>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<Recuerdo> Recuerdos => Set<Recuerdo>();
    public DbSet<Persona> Personas => Set<Persona>();
    public DbSet<RemovalRequest> RemovalRequests => Set<RemovalRequest>();
    public DbSet<SentEmail> SentEmails => Set<SentEmail>();
    public DbSet<EmailLinkClick> EmailLinkClicks => Set<EmailLinkClick>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<RecuerdoEmbedding> RecuerdoEmbeddings => Set<RecuerdoEmbedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ElBaulDbContext).Assembly);
    }
}
