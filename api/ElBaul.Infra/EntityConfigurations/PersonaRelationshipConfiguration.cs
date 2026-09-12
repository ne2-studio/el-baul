using ElBaul.Core.Personas.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PersonaRelationshipConfiguration : IEntityTypeConfiguration<PersonaRelationship>
{
    public void Configure(EntityTypeBuilder<PersonaRelationship> builder)
    {
        builder.ToTable("PersonaRelationships");
        builder.HasKey(r => new { r.ParentId, r.ChildId });
        builder.Property(r => r.ParentId).HasConversion(IdValueConverters.PersonaId);
        builder.Property(r => r.ChildId).HasConversion(IdValueConverters.PersonaId);
        builder.Property(r => r.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(r => r.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.ChildId);
        builder.HasIndex(r => r.BaulId);

        // Both Restrict, deliberately: both FKs point at the same Persona table, so a cascading
        // delete on either would collide with the other as two cascade paths converging on this
        // row — same reasoning as PhotoPersonaTagConfiguration's two Persona/Photo FKs. Cleanup
        // is explicit instead: see AdminBaulDeletionRepository.
        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(r => r.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(r => r.ChildId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
