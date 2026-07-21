using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class EmailLinkClickConfiguration : IEntityTypeConfiguration<EmailLinkClick>
{
    public void Configure(EntityTypeBuilder<EmailLinkClick> builder)
    {
        builder.ToTable("EmailLinkClicks");
        builder.HasKey(e => e.Token);
        builder.Property(e => e.Token).HasMaxLength(64);
        builder.Property(e => e.LinkKey).IsRequired().HasMaxLength(100);
        builder.Property(e => e.DestinationUrl).IsRequired().HasMaxLength(2000);
        builder.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(e => e.FirstClickedAt).HasColumnType("timestamp with time zone");
        builder.Property(e => e.LastClickedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(e => e.SentEmailId);

        builder.HasOne<SentEmail>()
            .WithMany()
            .HasForeignKey(e => e.SentEmailId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
