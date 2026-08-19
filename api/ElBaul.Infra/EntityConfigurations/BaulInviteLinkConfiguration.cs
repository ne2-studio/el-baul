using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Sharing.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class BaulInviteLinkConfiguration : IEntityTypeConfiguration<BaulInviteLink>
{
    public void Configure(EntityTypeBuilder<BaulInviteLink> builder)
    {
        builder.ToTable("BaulInviteLinks");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasConversion(IdValueConverters.BaulInviteLinkId);
        builder.Property(s => s.Token).IsRequired().HasMaxLength(160);
        builder.Property(s => s.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(s => s.CreatedBy).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(s => s.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(s => s.RevokedAt).HasColumnType("timestamp with time zone");
        builder.Ignore(s => s.IsRevoked);

        builder.HasIndex(s => s.Token).IsUnique();
        // At most one active (not-yet-revoked) link per baúl — this is what makes
        // GetOrCreateAsync/RegenerateAsync race-safe under concurrent admin requests; see
        // IBaulInviteLinkRepository.CreateAsync.
        builder.HasIndex(s => s.BaulId).IsUnique().HasFilter("\"RevokedAt\" IS NULL");

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(s => s.BaulId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
