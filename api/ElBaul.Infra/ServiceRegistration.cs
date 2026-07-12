using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Infra;

public static class ServiceRegistration
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ElBaulDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBaulRepository, BaulRepository>();
        services.AddScoped<IAlbumRepository, AlbumRepository>();
        services.AddScoped<IPhotoRepository, PhotoRepository>();
        services.AddScoped<IRecuerdoRepository, RecuerdoRepository>();
        services.AddScoped<IActivityRepository, ActivityRepository>();

        services.AddScoped<IIdGenerator, GuidIdGenerator>();
        services.AddScoped<IClock, SystemClock>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();

        // Singleton: wraps a single AmazonS3Client, which the AWS SDK documents as
        // thread-safe and designed for reuse/connection pooling across requests —
        // a deliberate exception to the default Scoped lifetime, not request state.
        services.Configure<StorageOptions>(configuration.GetSection("Storage"));
        services.AddSingleton<IPhotoStorage, MinioPhotoStorage>();

        return services;
    }
}
