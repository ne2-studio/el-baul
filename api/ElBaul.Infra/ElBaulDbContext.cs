using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Sharing.Domain;
using ElBaul.Core.Chat.Domain;
using ElBaul.Core.TvMode.Domain;
using ElBaul.Core.Moderation.Domain;
using ElBaul.Core.Notifications.Domain;
using ElBaul.Core.Feed.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Feed.OutputPorts;
using ElBaul.Core.Moderation.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.TvMode.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
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
    public DbSet<SentPushNotification> SentPushNotifications => Set<SentPushNotification>();
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
