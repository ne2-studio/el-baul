using ElBaul.OutputPorts.Chat;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class ChatMemoryEmbeddingConfiguration : IEntityTypeConfiguration<ChatMemoryEmbedding>
{
    public void Configure(EntityTypeBuilder<ChatMemoryEmbedding> builder)
    {
        builder.ToTable("ChatMemoryEmbeddings");
        // 1:1 with ChatMemory — a memory has at most one embedding (of the current
        // OpenAi:EmbeddingModel), same shape as RecuerdoEmbeddingConfiguration.
        builder.HasKey(e => e.ChatMemoryId);
        builder.Property(e => e.ChatMemoryId).HasConversion(IdValueConverters.ChatMemoryId);
        builder.Property(e => e.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(e => e.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Model).IsRequired().HasMaxLength(100);
        builder.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");

        // float[] maps natively to Postgres real[] via Npgsql — no pgvector extension needed,
        // same as RecuerdoEmbedding; similarity is computed in application code.
        builder.Property(e => e.Vector).IsRequired();

        builder.HasIndex(e => new { e.BaulId, e.UserId });

        builder.HasOne<ChatMemory>()
            .WithOne()
            .HasForeignKey<ChatMemoryEmbedding>(e => e.ChatMemoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
