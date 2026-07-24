using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class RemovalRequestConfiguration : IEntityTypeConfiguration<RemovalRequest>
{
    public void Configure(EntityTypeBuilder<RemovalRequest> builder)
    {
        builder.ToTable("RemovalRequests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasConversion(IdValueConverters.RemovalRequestId);
        builder.Property(r => r.BaulId).HasConversion(IdValueConverters.BaulId);
        builder.Property(r => r.PhotoId).HasConversion(IdValueConverters.PhotoId);
        builder.Property(r => r.PhotoStorageKey).IsRequired().HasMaxLength(1000);
        builder.Property(r => r.RequesterName).IsRequired().HasMaxLength(200);
        builder.Property(r => r.RequesterEmail).IsRequired().HasMaxLength(320);
        builder.Property(r => r.Reason).HasMaxLength(2000);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.RequestDate).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.BaulId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(r => r.BaulId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
