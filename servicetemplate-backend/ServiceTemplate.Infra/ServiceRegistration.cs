using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

public static class ServiceRegistration
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDatabase(configuration);

        // Singleton: the caching decorator holds state (an in-memory dictionary) that must survive
        // across requests to be useful — a deliberate exception to the default Scoped lifetime.
        services.AddSingleton<ITaskRepository>(sp =>
        {
            var postgresRepository = new PostgresTaskRepository(configuration.GetConnectionString("DefaultConnection")!);
            return new CachedTaskRepository(postgresRepository);
        });

        // Null Object pattern: the feature flag is read once, here, at the composition root.
        // Use-case code depends only on INotifier and never checks the flag itself.
        var notificationsEnabled = configuration.GetValue<bool>("Features:Notifications:Enabled");
        if (notificationsEnabled)
        {
            services.AddScoped<INotifier, LoggingNotifier>();
        }
        else
        {
            services.AddScoped<INotifier, NullNotifier>();
        }

        services.AddScoped<IIdGenerator, GuidIdGenerator>();
        services.AddScoped<IClock, SystemClock>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();

        return services;
    }
}
