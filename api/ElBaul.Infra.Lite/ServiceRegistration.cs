using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Infra.Lite;

public static class ServiceRegistration
{
    // Small, fixed vocabulary for FakeEmbeddingBackend's bag-of-words similarity — enough for
    // the chat's recuerdo ranking to behave non-trivially without a real embedding model.
    private static readonly string[] EmbeddingVocabulary =
    [
        "baul", "foto", "recuerdo", "familia", "viaje", "cumpleanos", "navidad", "boda",
        "infancia", "abuelos", "casa", "playa", "verano", "capitulo", "historia"
    ];

    public static IServiceCollection AddLiteInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Singleton, not Scoped: with no database behind them, these dictionaries *are* the
        // storage — they need to survive across requests, which is what Postgres/MinIO do for
        // the real adapters.
        services.AddSingleton<IUserRepository, InMemoryUserRepository>();
        services.AddSingleton<IBaulRepository, InMemoryBaulRepository>();
        services.AddSingleton<IChapterRepository, InMemoryChapterRepository>();
        services.AddSingleton<IPhotoRepository, InMemoryPhotoRepository>();
        services.AddSingleton<IRecuerdoRepository, InMemoryRecuerdoRepository>();
        services.AddSingleton<IChatMessageRepository, InMemoryChatMessageRepository>();
        services.AddSingleton<IRecuerdoEmbeddingRepository, InMemoryRecuerdoEmbeddingRepository>();
        services.AddSingleton<IAdminRepository, InMemoryAdminRepository>();
        services.AddSingleton<ISentEmailRepository, InMemorySentEmailRepository>();
        services.AddSingleton<IEmailLinkClickRepository, InMemoryEmailLinkClickRepository>();

        services.AddSingleton<IPhotoStorage, LitePhotoStorage>();
        services.AddSingleton<IEmailSender, FakeEmailSender>();
        services.AddSingleton<IBackgroundJobScheduler, FakeBackgroundJobScheduler>();
        services.AddSingleton<IAiChatBackend, FakeAiChatBackend>();
        services.AddSingleton<IEmbeddingBackend>(_ => new FakeEmbeddingBackend(EmbeddingVocabulary));
        services.AddSingleton<ISupportBackend, FakeSupportBackend>();
        services.AddSingleton<IEmailTemplateRenderer, FakeEmailTemplateRenderer>();
        services.AddSingleton<IPhotoDateExtractor, FakePhotoDateExtractor>();

        // These five are the real (ElBaul.Infra.Common) implementations, not fakes — none of
        // them touch Postgres/S3/Hangfire, and the whole point of sharing them is that
        // el-baul-api and el-baul-api-lite run the exact same compiled auth/user-sync logic.
        services.AddScoped<IClock, SystemClock>();
        services.AddScoped<IIdGenerator, GuidIdGenerator>();
        // Singleton here (unlike ElBaul.Infra's AddInfrastructure, which registers this
        // Scoped) — LitePhotoStorage is itself a singleton and depends on IAppConfiguration
        // directly for ApiPublicUrl, and a singleton can't consume a scoped service. Safe:
        // AppConfiguration is a stateless IConfiguration wrapper either way.
        services.AddSingleton<IAppConfiguration, AppConfiguration>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();
        services.AddHttpClient<IUserInfoClient, OidcUserInfoClient>();

        return services;
    }
}
