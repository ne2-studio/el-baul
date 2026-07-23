using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> builder)
    {
        builder.ToTable("ChatMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.UserId).IsRequired().HasMaxLength(255);
        builder.Property(m => m.Role).HasConversion<string>().IsRequired().HasMaxLength(20);
        // Unbounded text, not HasMaxLength(4000) like Recuerdo — that limit fits a person typing,
        // not a model reply, which can easily run longer and would otherwise fail to insert.
        builder.Property(m => m.Content).IsRequired().HasColumnType("text");
        builder.Property(m => m.CreatedAt).HasColumnType("timestamp with time zone");

        // The (BaulId, UserId) pair is the whole query shape — GetByBaulAndUserAsync always
        // filters on both, ordered by CreatedAt.
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
