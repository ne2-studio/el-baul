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
        builder.Property(r => r.Id).HasConversion(IdValueConverters.RecuerdoId);
        builder.Property(r => r.PhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.Property(r => r.ChapterId).HasConversion(IdValueConverters.ChapterId);
        builder.Property(r => r.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(r => r.UserId).IsRequired().HasMaxLength(255);
        builder.Property(r => r.Text).IsRequired().HasMaxLength(4000);
        builder.Property(r => r.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.PhotoId);
        builder.HasIndex(r => r.ChapterId);
        builder.HasIndex(r => r.BaulId);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(r => r.PhotoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        // ChapterId is denormalized from Photo.ChapterId (or set directly for photo-less,
        // chapter-level recuerdos) so the Recuerdos feed can query by chapter without joining
        // through Photo. Restrict, not Cascade: Chapter->Photo->Recuerdo is already a cascade
        // path (see PhotoConfiguration), so a second direct Chapter->Recuerdo cascade path would
        // make SQL Server reject the migration.
        builder.HasOne<Chapter>()
            .WithMany()
            .HasForeignKey(r => r.ChapterId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // BaulId is denormalized from Photo.BaulId / Chapter.BaulId (or set directly for
        // standalone, photo-less and chapter-less recuerdos) so the Recuerdos feed can query by
        // baúl without joining through Photo/Chapter. Restrict, not Cascade: Baul->Chapter->Photo->
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
