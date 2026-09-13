using ElBaul.Core.Photos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class UserPhotoAssetConfiguration : IEntityTypeConfiguration<UserPhotoAsset>
{
    public void Configure(EntityTypeBuilder<UserPhotoAsset> builder)
    {
        builder.ToTable("UserPhotoAssets");
        builder.HasKey(r => new { r.UserId, r.PhotoAssetId });
        builder.Property(r => r.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(r => r.PhotoAssetId).HasConversion(IdValueConverters.PhotoAssetId);
        builder.Property(r => r.AddedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.PhotoAssetId);

        // Restrict, not Cascade — same rationale as Photo->PhotoAsset (PhotoConfiguration): a
        // canonical PhotoAsset with no remaining UserPhotoAsset/Photo references becomes an
        // intentional orphan (Slice 3's cleanup concern), never implicitly deleted by the
        // database as a side effect of deleting a relation or a user.
        builder.HasOne<PhotoAsset>()
            .WithMany()
            .HasForeignKey(r => r.PhotoAssetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
