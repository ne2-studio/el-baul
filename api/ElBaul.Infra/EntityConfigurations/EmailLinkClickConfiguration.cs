using ElBaul.Core.Notifications.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class EmailLinkClickConfiguration : IEntityTypeConfiguration<EmailLinkClick>
{
    public void Configure(EntityTypeBuilder<EmailLinkClick> builder)
    {
        builder.ToTable("EmailLinkClicks");
        builder.HasKey(e => e.Token);
        // Signed tokens (IEmailLinkSigner) are self-contained — they base64-encode a JSON payload
        // that embeds the full DestinationUrl (up to 2000 chars, see below) plus LinkKey and
        // SentEmailId — so this has to comfortably outsize DestinationUrl's own max length, not
        // just the legacy plain-Guid tokens (36 chars) minted before that scheme existed.
        builder.Property(e => e.Token).HasMaxLength(4000);
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
