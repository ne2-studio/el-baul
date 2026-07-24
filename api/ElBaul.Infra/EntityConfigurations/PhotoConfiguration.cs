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
        builder.Property(p => p.UploadedBy).IsRequired().HasMaxLength(255);
        builder.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).HasDefaultValue(PhotoStatus.Active);
        builder.Property(p => p.DeletedAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.DeletionReason).HasMaxLength(2000);

        builder.HasIndex(p => p.ChapterId);
        builder.HasIndex(p => p.BaulId);
        builder.HasIndex(p => p.ClientUploadId).IsUnique();

        builder.HasOne<Chapter>()
            .WithMany()
            .HasForeignKey(p => p.ChapterId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        // BaulId is redundant with ChapterId->Baul for cheap baul-scoped queries (preview photos);
        // Restrict avoids a second cascade path alongside Chapter's.
        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(p => p.BaulId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
