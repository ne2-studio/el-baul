using ElBaul.Core.Users.Domain;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ElBaul.Infra.EntityConfigurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasConversion(IdValueConverters.UserId).HasMaxLength(255);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(320);
        builder.Property(u => u.Nombre).HasMaxLength(100);
        builder.Property(u => u.Apellidos).HasMaxLength(100);
        builder.Property(u => u.CreatedAt).HasColumnType("timestamp with time zone");
        builder.Property(u => u.LastAccessAt).HasColumnType("timestamp with time zone");
        builder.Property(u => u.WeeklyDigestEnabled).IsRequired().HasDefaultValue(true);
        builder.Property(u => u.HasSeenOnboarding).IsRequired().HasDefaultValue(false);
        builder.Property(u => u.LastPushDigestSentAt).HasColumnType("timestamp with time zone");

        builder.HasIndex(u => u.Email).IsUnique();
    }
}
