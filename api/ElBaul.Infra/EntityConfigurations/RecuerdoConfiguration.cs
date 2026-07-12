using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class RecuerdoConfiguration : IEntityTypeConfiguration<Recuerdo>
{
    public void Configure(EntityTypeBuilder<Recuerdo> builder)
    {
        builder.ToTable("Recuerdos");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.UserId).IsRequired().HasMaxLength(255);
        builder.Property(r => r.Text).IsRequired().HasMaxLength(4000);
        builder.Property(r => r.CreatedAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(r => r.PhotoId);

        builder.HasOne<Photo>()
            .WithMany()
            .HasForeignKey(r => r.PhotoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
