using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("Photos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.StorageKey).IsRequired().HasMaxLength(1000);
        builder.Property(p => p.Caption).HasMaxLength(2000);
        builder.Property(p => p.UploadedBy).IsRequired().HasMaxLength(255);
        builder.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(p => p.AlbumId);
        builder.HasIndex(p => p.BaulId);
        builder.HasIndex(p => p.ClientUploadId).IsUnique();

        builder.HasOne<Album>()
            .WithMany()
            .HasForeignKey(p => p.AlbumId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        // BaulId is redundant with AlbumId->Baul for cheap baul-scoped queries (preview photos);
        // Restrict avoids a second cascade path alongside Album's.
        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(p => p.BaulId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
