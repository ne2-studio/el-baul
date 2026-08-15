using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class ChapterConfiguration : IEntityTypeConfiguration<Chapter>
{
    public void Configure(EntityTypeBuilder<Chapter> builder)
    {
        builder.ToTable("Chapters");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasConversion(IdValueConverters.ChapterId);
        builder.Property(a => a.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(a => a.Name).IsRequired().HasMaxLength(200);
        builder.Property(a => a.CoverCropX).HasPrecision(5, 4).HasDefaultValue(0.5m);
        builder.Property(a => a.CoverCropY).HasPrecision(5, 4).HasDefaultValue(0.5m);
        builder.Property(a => a.CoverCropScale).HasPrecision(4, 2).HasDefaultValue(1m);
        builder.Property(a => a.CoverPhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(a => a.UpdatedAt).HasColumnType("timestamp with time zone");
        builder.Property(a => a.CreatedByUserId).IsRequired().HasMaxLength(255).HasDefaultValue("");

        builder.HasIndex(a => a.BaulId);
        builder.HasIndex(a => a.CoverPhotoId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(a => a.BaulId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(a => a.CoverPhotoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
