using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class SharedLinkConfiguration : IEntityTypeConfiguration<SharedLink>
{
    public void Configure(EntityTypeBuilder<SharedLink> builder)
    {
        builder.ToTable("SharedLinks");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasConversion(IdValueConverters.SharedLinkId);
        builder.Property(s => s.Token).IsRequired().HasMaxLength(160);
        builder.Property(s => s.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(s => s.ContentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.PhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.Property(s => s.RecuerdoId).HasConversion(IdValueConverters.RecuerdoId);
        builder.Property(s => s.CreatedBy).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(s => s.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(s => s.RevokedAt).HasColumnType("timestamp with time zone");
        builder.Ignore(s => s.IsRevoked);

        builder.HasIndex(s => s.Token).IsUnique();
        builder.HasIndex(s => s.BaulId);
        builder.HasIndex(s => s.PhotoId);
        builder.HasIndex(s => s.RecuerdoId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(s => s.BaulId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(s => s.PhotoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Recuerdo>()
            .WithMany()
            .HasForeignKey(s => s.RecuerdoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
