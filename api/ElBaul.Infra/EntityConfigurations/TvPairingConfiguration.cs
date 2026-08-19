using ElBaul.Core.TvMode.Domain;
using ElBaul.Core.TvMode.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class TvPairingConfiguration : IEntityTypeConfiguration<TvPairing>
{
    public void Configure(EntityTypeBuilder<TvPairing> builder)
    {
        builder.ToTable("TvPairings");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasConversion(IdValueConverters.TvPairingId);
        builder.Property(p => p.Code).IsRequired().HasMaxLength(160);
        builder.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.ExpiresAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.ClaimedSessionToken).HasMaxLength(160);
        builder.Ignore(p => p.IsClaimed);

        builder.HasIndex(p => p.Code).IsUnique();
    }
}
