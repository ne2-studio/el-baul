using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Feed;
using ElBaul.OutputPorts.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class BaulFeedCursorConfiguration : IEntityTypeConfiguration<BaulFeedCursor>
{
    public void Configure(EntityTypeBuilder<BaulFeedCursor> builder)
    {
        builder.ToTable("BaulFeedCursors");
        builder.HasKey(c => new { c.UserId, c.BaulId });
        builder.Property(c => c.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(c => c.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(c => c.LastSeenAt).HasColumnType("timestamp with time zone");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(c => c.BaulId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
