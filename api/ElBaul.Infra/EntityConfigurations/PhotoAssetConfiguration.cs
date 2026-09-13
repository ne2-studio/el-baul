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
        builder.Property(a => a.UploadedBy).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
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

        // The global exact-duplicate invariant (Slice 2.5, docs/.backlog issue #62): "same exact
        // bytes → same PhotoAsset" is meaningless without a database-level guarantee that no two
        // PhotoAssets ever carry the same hash. Partial (non-null only) so legacy PhotoAssets
        // created before OriginalContentHash existed — which all share the same null value —
        // never collide with each other or block new uploads; see PhotoAsset's doc comment on
        // legacy assets that can't yet participate in deduplication.
        builder.HasIndex(a => a.OriginalContentHash)
            .IsUnique()
            .HasFilter("\"OriginalContentHash\" IS NOT NULL")
            .HasDatabaseName("IX_PhotoAssets_OriginalContentHash");
    }
}
