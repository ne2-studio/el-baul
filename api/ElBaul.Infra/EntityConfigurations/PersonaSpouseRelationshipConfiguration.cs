using ElBaul.Core.Personas.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class PersonaSpouseRelationshipConfiguration : IEntityTypeConfiguration<PersonaSpouseRelationship>
{
    public void Configure(EntityTypeBuilder<PersonaSpouseRelationship> builder)
    {
        builder.ToTable("PersonaSpouseRelationships");
        builder.HasKey(r => new { r.PersonaId1, r.PersonaId2 });
        builder.Property(r => r.PersonaId1).HasConversion(IdValueConverters.PersonaId);
        builder.Property(r => r.PersonaId2).HasConversion(IdValueConverters.PersonaId);
        builder.Property(r => r.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(r => r.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.PersonaId2);
        builder.HasIndex(r => r.BaulId);

        // Both Restrict, deliberately: both FKs point at the same Persona table, so a cascading
        // delete on either would collide with the other as two cascade paths converging on this
        // row — same reasoning as PersonaRelationshipConfiguration's two Persona FKs. Cleanup
        // is explicit instead: see AdminBaulDeletionRepository.
        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(r => r.PersonaId1)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(r => r.PersonaId2)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
