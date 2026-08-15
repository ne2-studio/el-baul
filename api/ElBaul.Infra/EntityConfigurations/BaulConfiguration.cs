using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class BaulConfiguration : IEntityTypeConfiguration<Baul>
{
    public void Configure(EntityTypeBuilder<Baul> builder)
    {
        builder.ToTable("Baules");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasConversion(IdValueConverters.BaulId);
        builder.Property(b => b.Name).IsRequired().HasMaxLength(200);
        builder.Property(b => b.Description).HasMaxLength(2000);
        builder.Property(b => b.CustodioId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(b => b.CoverPhotoKey).HasMaxLength(1000);
        builder.Property(b => b.CoverCropX).HasPrecision(5, 4).HasDefaultValue(0.5m);
        builder.Property(b => b.CoverCropY).HasPrecision(5, 4).HasDefaultValue(0.5m);
        builder.Property(b => b.CoverCropScale).HasPrecision(4, 2).HasDefaultValue(1m);
        builder.Property(b => b.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(b => b.UpdatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(b => b.CustodioId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(b => b.CustodioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
