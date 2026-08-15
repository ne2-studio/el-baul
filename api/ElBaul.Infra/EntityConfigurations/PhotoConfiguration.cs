using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("Photos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasConversion(IdValueConverters.PhotoId);
        builder.Property(p => p.ChapterId).HasConversion(IdValueConverters.ChapterId);
        builder.Property(p => p.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(p => p.StorageKey).IsRequired().HasMaxLength(1000);
        builder.Property(p => p.UploadedBy).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).HasDefaultValue(PhotoStatus.Active);
        builder.Property(p => p.DeletedAt).HasColumnType("timestamp with time zone");
        builder.Property(p => p.DeletionReason).HasMaxLength(2000);
        builder.Property(p => p.SizeBytes).HasDefaultValue(0L);
        builder.Property(p => p.ConfirmedNoPersonas).HasDefaultValue(false);
        builder.Property(p => p.Width).HasDefaultValue(0);
        builder.Property(p => p.Height).HasDefaultValue(0);
        // Lowercase hex-encoded SHA-256 is always exactly 64 characters.
        builder.Property(p => p.OriginalContentHash).HasMaxLength(64);
        builder.Ignore(p => p.Date);

        builder.HasIndex(p => p.ChapterId);
        builder.HasIndex(p => p.BaulId);
        builder.HasIndex(p => p.ClientUploadId).IsUnique();
        builder.HasIndex(p => p.UploadBatchId);
        // The database-level enforcement of "no two active photos in the same baúl share an
        // exact-duplicate hash" (see PhotoDuplicateMergeService) — application-level checks in
        // PhotoUploadWorkflow exist for normal-flow UX, but this index is what actually resolves
        // a race between two concurrent identical uploads. Scoped to Active + non-null so
        // soft-deleted duplicates (which intentionally keep their original hash — see
        // Photo.MarkDeleted) never block a later legitimate upload/backfill/merge from reaching a
        // clean Active state.
        builder.HasIndex(p => new { p.BaulId, p.OriginalContentHash })
            .IsUnique()
            .HasFilter("\"Status\" = 'Active' AND \"OriginalContentHash\" IS NOT NULL")
            .HasDatabaseName("IX_Photos_BaulId_OriginalContentHash_Active");

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
