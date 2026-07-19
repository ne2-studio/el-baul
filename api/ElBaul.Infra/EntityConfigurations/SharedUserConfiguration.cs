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
        builder.Property(s => s.Nickname).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Name).HasMaxLength(100);
        builder.Property(s => s.AvatarPhotoKey).HasMaxLength(1000);
        builder.Property(s => s.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.InvitedDate).HasColumnType("timestamp with time zone");

        builder.HasIndex(s => s.BaulId);
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => new { s.BaulId, s.UserId }).IsUnique().HasFilter("\"UserId\" IS NOT NULL");

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
