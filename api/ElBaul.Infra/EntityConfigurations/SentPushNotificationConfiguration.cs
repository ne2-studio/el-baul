using ElBaul.Core.Users.Domain;
using ElBaul.Core.Notifications.Domain;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class SentPushNotificationConfiguration : IEntityTypeConfiguration<SentPushNotification>
{
    public void Configure(EntityTypeBuilder<SentPushNotification> builder)
    {
        builder.ToTable("SentPushNotifications");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(n => n.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(200);
        builder.Property(n => n.Body).IsRequired().HasMaxLength(1000);
        builder.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(n => n.DeduplicationKey).IsRequired().HasMaxLength(255);
        builder.Property(n => n.Provider).HasMaxLength(50);
        builder.Property(n => n.DeepLink).HasMaxLength(500);
        builder.Property(n => n.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(n => n.SentAt).HasColumnType("timestamp with time zone");
        builder.Property(n => n.FirstOpenedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(n => n.DeduplicationKey).IsUnique();
        builder.HasIndex(n => n.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
