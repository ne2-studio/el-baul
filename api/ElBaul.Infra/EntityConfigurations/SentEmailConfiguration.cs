using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class SentEmailConfiguration : IEntityTypeConfiguration<SentEmail>
{
    public void Configure(EntityTypeBuilder<SentEmail> builder)
    {
        builder.ToTable("SentEmails");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.UserId).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Subject).IsRequired().HasMaxLength(500);
        builder.Property(e => e.RecipientEmail).IsRequired().HasMaxLength(320);
        builder.Property(e => e.TemplateVersion).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Locale).IsRequired().HasMaxLength(10);
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.DeduplicationKey).IsRequired().HasMaxLength(255);
        builder.Property(e => e.Provider).HasMaxLength(50);
        builder.Property(e => e.ProviderMessageId).HasMaxLength(255);
        builder.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(e => e.SendAttemptedAt).HasColumnType("timestamp with time zone");
        builder.Property(e => e.SentAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(e => e.DeduplicationKey).IsUnique();
        builder.HasIndex(e => e.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
