using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PushTokenConfiguration : IEntityTypeConfiguration<PushToken>
{
    public void Configure(EntityTypeBuilder<PushToken> builder)
    {
        builder.ToTable("PushTokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(t => t.Token).IsRequired().HasMaxLength(400);
        builder.Property(t => t.Platform).IsRequired().HasMaxLength(50);
        builder.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");

        // A token is globally unique regardless of owner — see IPushTokenRepository.UpsertAsync.
        builder.HasIndex(t => t.Token).IsUnique();
        builder.HasIndex(t => t.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
