using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("Activities");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Type).HasConversion<string>().HasMaxLength(50);
        builder.Property(a => a.BaulName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.RequesterEmail).HasMaxLength(320);
        builder.Property(a => a.Timestamp).HasColumnType("timestamp with time zone");

        builder.HasIndex(a => a.BaulId);

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(a => a.BaulId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
