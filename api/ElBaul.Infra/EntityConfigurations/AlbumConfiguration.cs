using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class AlbumConfiguration : IEntityTypeConfiguration<Album>
{
    public void Configure(EntityTypeBuilder<Album> builder)
    {
        builder.ToTable("Albums");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Name).IsRequired().HasMaxLength(200);
        builder.Property(a => a.CoverPhotoKey).HasMaxLength(1000);
        builder.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(a => a.UpdatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(a => a.BaulId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(a => a.BaulId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
