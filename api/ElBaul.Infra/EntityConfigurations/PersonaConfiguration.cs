using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PersonaConfiguration : IEntityTypeConfiguration<Persona>
{
    public void Configure(EntityTypeBuilder<Persona> builder)
    {
        builder.ToTable("Personas");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasConversion(IdValueConverters.PersonaId);
        builder.Property(s => s.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(s => s.UserId).HasConversion(IdValueConverters.UserId).HasMaxLength(255);
        builder.Property(s => s.Nickname).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Name).HasMaxLength(100);
        builder.Property(s => s.AvatarPhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.ComplexProperty(s => s.AvatarCrop, crop =>
        {
            crop.Property(c => c.X).HasColumnName("AvatarCropX").HasPrecision(5, 4).HasDefaultValue(0.5m);
            crop.Property(c => c.Y).HasColumnName("AvatarCropY").HasPrecision(5, 4).HasDefaultValue(0.5m);
            crop.Property(c => c.Scale).HasColumnName("AvatarCropScale").HasPrecision(4, 2).HasDefaultValue(1m);
        });
        builder.Property(s => s.Biografia).HasMaxLength(4000);
        builder.Property(s => s.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.InvitedDate).HasColumnType("timestamp with time zone");

        builder.HasIndex(s => s.BaulId);
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => s.AvatarPhotoId);
        builder.HasIndex(s => new { s.BaulId, s.UserId }).IsUnique().HasFilter("\"UserId\" IS NOT NULL");

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(s => s.BaulId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(s => s.AvatarPhotoId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
