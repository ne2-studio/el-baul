using ElBaul.Application.Photos;
using ElBaul.OutputPorts.Admin;
using ElBaul.OutputPorts.Analytics;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Feed;
using ElBaul.OutputPorts.Memories;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Support;
using ElBaul.OutputPorts.TvMode;
using ElBaul.OutputPorts.Users;
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
        // Scoped, not Singleton, unlike the InMemory* repositories below — it holds no state of
        // its own (see FakeUnitOfWork's doc comment), so its lifetime doesn't matter, but Scoped
        // matches every other stateless port implementation here (IClock, IIdGenerator, …).
        services.AddScoped<IUnitOfWork, FakeUnitOfWork>();
        services.AddSingleton<IUserBaulActivityDailyAggregator, NoOpUserBaulActivityDailyAggregator>();
        services.AddSingleton<IUserRepository, InMemoryUserRepository>();
        services.AddSingleton<IBaulRepository, InMemoryBaulRepository>();
        services.AddSingleton<IChapterRepository, InMemoryChapterRepository>();
        services.AddScoped<IChapterListReadModel, InMemoryChapterListReadModel>();
        services.AddSingleton<IPhotoRepository, InMemoryPhotoRepository>();
        services.AddScoped<IPhotoListReadModel, InMemoryPhotoListReadModel>();
        services.AddScoped<IPhotoUploadBatchReadModel, InMemoryPhotoUploadBatchReadModel>();
        services.AddSingleton<IRecuerdoRepository, InMemoryRecuerdoRepository>();
        services.AddScoped<IRecuerdoListReadModel, InMemoryRecuerdoListReadModel>();
        services.AddSingleton<ISharedLinkRepository, InMemorySharedLinkRepository>();
        services.AddSingleton<IBaulInviteLinkRepository, InMemoryBaulInviteLinkRepository>();
        services.AddSingleton<ITvSessionRepository, InMemoryTvSessionRepository>();
        services.AddSingleton<ITvPairingRepository, InMemoryTvPairingRepository>();
        services.AddSingleton<IChatMessageRepository, InMemoryChatMessageRepository>();
        services.AddSingleton<IRecuerdoEmbeddingRepository, InMemoryRecuerdoEmbeddingRepository>();
        services.AddSingleton<IChatMemoryRepository, InMemoryChatMemoryRepository>();
        services.AddSingleton<IChatMemoryEmbeddingRepository, InMemoryChatMemoryEmbeddingRepository>();
        services.AddSingleton<IAdminRepository, InMemoryAdminRepository>();
        services.AddScoped<IAdminBaulDeletionRepository, InMemoryAdminBaulDeletionRepository>();
        services.AddSingleton<IPushTokenRepository, InMemoryPushTokenRepository>();
        services.AddSingleton<IBaulFeedCursorRepository, InMemoryBaulFeedCursorRepository>();
        services.AddSingleton<ISentEmailRepository, InMemorySentEmailRepository>();
        services.AddSingleton<IEmailLinkClickRepository, InMemoryEmailLinkClickRepository>();
        services.AddSingleton<IEmailLinkSigner, EmailLinkSigner>();
        services.AddSingleton<IPhotoPersonaTagRepository, InMemoryPhotoPersonaTagRepository>();

        services.AddSingleton<IPhotoStorage, LitePhotoStorage>();
        services.AddSingleton<IEmailSender, FakeEmailSender>();
        services.AddSingleton<IPushNotificationSender, FakePushNotificationSender>();
        services.AddSingleton<IBackgroundJobScheduler, FakeBackgroundJobScheduler>();
        services.AddSingleton<IAiChatBackend, FakeAiChatBackend>();
        services.AddSingleton<IEmbeddingBackend>(_ => new FakeEmbeddingBackend(EmbeddingVocabulary));
        services.AddSingleton<IChatMemoryExtractionBackend, FakeChatMemoryExtractionBackend>();
        services.AddSingleton<ISupportBackend, FakeSupportBackend>();
        services.AddSingleton<IEmailTemplateRenderer, FakeEmailTemplateRenderer>();
        services.AddSingleton<IPhotoDateExtractor, FakePhotoDateExtractor>();
        services.AddSingleton<IPhotoImageNormalizer, FakePhotoImageNormalizer>();
        // Defaults only — el-baul-api-lite has no need to exercise non-default ImagePolicy
        // limits, and FakeImageProcessor never rejects/resizes for the tiny fixtures it's fed.
        services.AddSingleton(new ImagePolicy());
        services.AddSingleton<IImageProcessor, FakeImageProcessor>();

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
        services.AddHttpClient<IProfilePictureFetcher, HttpProfilePictureFetcher>();

        return services;
    }
}

internal sealed class NoOpUserBaulActivityDailyAggregator : IUserBaulActivityDailyAggregator
{
    public Task AggregateForDateAsync(DateOnly date) => Task.CompletedTask;
}
