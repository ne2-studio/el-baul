using ElBaul.Application.Admin;
using ElBaul.Application.Personas;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.Shared;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PhotoPersonaTagConfiguration : IEntityTypeConfiguration<PhotoPersonaTag>
{
    public void Configure(EntityTypeBuilder<PhotoPersonaTag> builder)
    {
        builder.ToTable("PhotoPersonaTags");
        builder.HasKey(t => new { t.PhotoId, t.PersonaId });
        builder.Property(t => t.PhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.Property(t => t.PersonaId).HasConversion(IdValueConverters.PersonaId);
        builder.Property(t => t.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(t => t.PersonaId);
        builder.HasIndex(t => t.BaulId);

        // Both Restrict, deliberately: Baul -> Chapter (cascade) -> Photo (cascade) and
        // Baul -> Persona (cascade) are two independent cascade paths that would both converge
        // on this table if either FK cascaded too — the same "multiple cascade paths" problem
        // PhotoConfiguration's Photo->Baul FK already avoids. Cleanup is explicit instead: see
        // AdminManager.DeleteBaulAsync and PersonaManager.RemovePersonaAsync.
        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(t => t.PhotoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(t => t.PersonaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
