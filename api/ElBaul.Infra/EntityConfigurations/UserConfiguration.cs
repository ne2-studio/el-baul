using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasMaxLength(255);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(320);
        builder.Property(u => u.Name).HasMaxLength(200);
        builder.Property(u => u.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(u => u.LastAccessAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(u => u.Email).IsUnique();
    }
}
