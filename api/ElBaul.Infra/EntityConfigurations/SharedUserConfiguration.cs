using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class SharedUserConfiguration : IEntityTypeConfiguration<SharedUser>
{
    public void Configure(EntityTypeBuilder<SharedUser> builder)
    {
        builder.ToTable("SharedUsers");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.UserId).HasMaxLength(255);
        builder.Property(s => s.Email).IsRequired().HasMaxLength(320);
        builder.Property(s => s.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.InvitedDate).HasColumnType("timestamp with time zone");

        builder.HasIndex(s => s.BaulId);
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => new { s.BaulId, s.Email }).IsUnique();

        builder.HasOne<Baul>()
            .WithMany()
            .HasForeignKey(s => s.BaulId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
