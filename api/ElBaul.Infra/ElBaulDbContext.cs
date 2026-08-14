using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Feed;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.TvMode;
using ElBaul.OutputPorts.Users;
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
    public DbSet<PhotoPersonaTag> PhotoPersonaTags => Set<PhotoPersonaTag>();
    public DbSet<RemovalRequest> RemovalRequests => Set<RemovalRequest>();
    public DbSet<SentEmail> SentEmails => Set<SentEmail>();
    public DbSet<EmailLinkClick> EmailLinkClicks => Set<EmailLinkClick>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<RecuerdoEmbedding> RecuerdoEmbeddings => Set<RecuerdoEmbedding>();
    public DbSet<SharedLink> SharedLinks => Set<SharedLink>();
    public DbSet<BaulInviteLink> BaulInviteLinks => Set<BaulInviteLink>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<BaulFeedCursor> BaulFeedCursors => Set<BaulFeedCursor>();
    public DbSet<ChatMemory> ChatMemories => Set<ChatMemory>();
    public DbSet<ChatMemoryEmbedding> ChatMemoryEmbeddings => Set<ChatMemoryEmbedding>();
    public DbSet<TvSession> TvSessions => Set<TvSession>();
    public DbSet<TvPairing> TvPairings => Set<TvPairing>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ElBaulDbContext).Assembly);
    }
}
