using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class RecuerdoConfiguration : IEntityTypeConfiguration<Recuerdo>
{
    public void Configure(EntityTypeBuilder<Recuerdo> builder)
    {
        builder.ToTable("Recuerdos");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.UserId).IsRequired().HasMaxLength(255);
        builder.Property(r => r.Text).IsRequired().HasMaxLength(4000);
        builder.Property(r => r.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.PhotoId);
        builder.HasIndex(r => r.AlbumId);
        builder.HasIndex(r => r.BaulId);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(r => r.PhotoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        // AlbumId is denormalized from Photo.AlbumId (or set directly for photo-less,
        // chapter-level recuerdos) so the Recuerdos feed can query by album without joining
        // through Photo. Restrict, not Cascade: Album->Photo->Recuerdo is already a cascade
        // path (see PhotoConfiguration), so a second direct Album->Recuerdo cascade path would
        // make SQL Server reject the migration.
        builder.HasOne<Album>()
            .WithMany()
            .HasForeignKey(r => r.AlbumId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // BaulId is denormalized from Photo.BaulId / Album.BaulId (or set directly for
        // standalone, photo-less and album-less recuerdos) so the Recuerdos feed can query by
        // baúl without joining through Photo/Album. Restrict, not Cascade: Baul->Album->Photo->
        // Recuerdo and Baul->Photo->Recuerdo are already cascade paths, so a third direct
        // Baul->Recuerdo cascade path would make the migration invalid.
        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(r => r.BaulId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
