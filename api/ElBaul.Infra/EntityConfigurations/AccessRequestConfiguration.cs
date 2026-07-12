using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class AccessRequestConfiguration : IEntityTypeConfiguration<AccessRequest>
{
    public void Configure(EntityTypeBuilder<AccessRequest> builder)
    {
        builder.ToTable("AccessRequests");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Email).IsRequired().HasMaxLength(320);
        builder.Property(r => r.Name).HasMaxLength(200);
        builder.Property(r => r.Message).HasMaxLength(2000);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.RequestDate).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.BaulId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(r => r.BaulId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
