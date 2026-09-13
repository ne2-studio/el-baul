using ElBaul.Core.Photos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PhotoAssetConfiguration : IEntityTypeConfiguration<PhotoAsset>
{
    public void Configure(EntityTypeBuilder<PhotoAsset> builder)
    {
        builder.ToTable("PhotoAssets");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasConversion(IdValueConverters.PhotoAssetId);
        builder.Property(a => a.StorageKey).IsRequired().HasMaxLength(1000);
        builder.Property(a => a.SizeBytes).HasDefaultValue(0L);
        builder.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
        builder.ComplexProperty(a => a.Dimensions, dimensions =>
        {
            dimensions.Property(d => d.Width).HasColumnName("Width").IsRequired();
            dimensions.Property(d => d.Height).HasColumnName("Height").IsRequired();
        });
        builder.ComplexProperty(a => a.OriginalDimensions, dimensions =>
        {
            dimensions.Property(d => d.Width).HasColumnName("OriginalWidth");
            dimensions.Property(d => d.Height).HasColumnName("OriginalHeight");
        });
        // Lowercase hex-encoded SHA-256 is always exactly 64 characters.
        builder.Property(a => a.OriginalContentHash).HasMaxLength(64);
    }
}
