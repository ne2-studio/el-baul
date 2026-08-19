using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class ChatMemoryConfiguration : IEntityTypeConfiguration<ChatMemory>
{
    public void Configure(EntityTypeBuilder<ChatMemory> builder)
    {
        builder.ToTable("ChatMemories");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasConversion(IdValueConverters.ChatMemoryId);
        builder.Property(m => m.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(m => m.UserId).HasConversion(IdValueConverters.UserId).IsRequired().HasMaxLength(255);
        builder.Property(m => m.Content).IsRequired().HasColumnType("text");
        builder.Property(m => m.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(m => m.UpdatedAt).HasColumnType("timestamp with time zone");

        // A bare Guid, not a strongly-typed id — see ChatMemory.SourceMessageId's doc comment.
        builder.Property(m => m.SourceMessageId);

        // (BaulId, UserId) is the whole query shape — every read is scoped to both, never one
        // alone (see ChatMemoryManager/RelevantChatMemorySelector).
        builder.HasIndex(m => new { m.BaulId, m.UserId });

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(m => m.BaulId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
