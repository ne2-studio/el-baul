using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class RecuerdoEmbeddingConfiguration : IEntityTypeConfiguration<RecuerdoEmbedding>
{
    public void Configure(EntityTypeBuilder<RecuerdoEmbedding> builder)
    {
        builder.ToTable("RecuerdoEmbeddings");
        // 1:1 with Recuerdo — RecuerdoId is the primary key, not a separate Id, since a
        // recuerdo has at most one embedding (of the current OpenAi:EmbeddingModel).
        builder.HasKey(e => e.RecuerdoId);
        builder.Property(e => e.Model).IsRequired().HasMaxLength(100);
        builder.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");

        // float[] maps natively to Postgres real[] via Npgsql — no pgvector extension needed;
        // similarity is computed in application code (see ChatManager), not in SQL.
        builder.Property(e => e.Vector).IsRequired();

        builder.HasIndex(e => e.BaulId);

        builder.HasOne<Recuerdo>()
            .WithOne()
            .HasForeignKey<RecuerdoEmbedding>(e => e.RecuerdoId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
