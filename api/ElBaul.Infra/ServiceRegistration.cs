using ElBaul.Core.Photos.Application;
using ElBaul.Infra.Chat;
using ElBaul.Infra.Emails;
using ElBaul.Infra.Analytics;
using ElBaul.Infra.Persistence;
using ElBaul.Infra.PhotoStorage;
using ElBaul.Infra.PushNotifications;
using ElBaul.Core.Admin.OutputPorts;
using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Feed.OutputPorts;
using ElBaul.Core.Moderation.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.Support.OutputPorts;
using ElBaul.Core.TvMode.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
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

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserBaulActivityDailyAggregator, UserBaulActivityDailyAggregator>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBaulRepository, BaulRepository>();
        services.AddScoped<IRemovalRequestRepository, RemovalRequestRepository>();
        services.AddScoped<IChapterRepository, ChapterRepository>();
        services.AddScoped<IChapterListReadModel, ChapterListReadModel>();
        services.AddScoped<IPhotoRepository, PhotoRepository>();
        services.AddScoped<IPhotoListReadModel, PhotoListReadModel>();
        services.AddScoped<IPhotoUploadBatchReadModel, PhotoUploadBatchReadModel>();
        services.AddScoped<IRecuerdoRepository, RecuerdoRepository>();
        services.AddScoped<IRecuerdoListReadModel, RecuerdoListReadModel>();
        services.AddScoped<ISharedLinkRepository, SharedLinkRepository>();
        services.AddScoped<IBaulInviteLinkRepository, BaulInviteLinkRepository>();
        services.AddScoped<ITvSessionRepository, TvSessionRepository>();
        services.AddScoped<ITvPairingRepository, TvPairingRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IPhotoPersonaTagRepository, PhotoPersonaTagRepository>();
        services.AddScoped<IRecuerdoEmbeddingRepository, RecuerdoEmbeddingRepository>();
        services.AddScoped<IChatMemoryRepository, ChatMemoryRepository>();
        services.AddScoped<IChatMemoryEmbeddingRepository, ChatMemoryEmbeddingRepository>();
        services.AddScoped<IAdminRepository, AdminRepository>();
        services.AddScoped<IAdminBaulDeletionRepository, AdminBaulDeletionRepository>();
        services.AddScoped<IPushTokenRepository, PushTokenRepository>();
        services.AddScoped<IBaulFeedCursorRepository, BaulFeedCursorRepository>();
        services.AddScoped<ISentEmailRepository, SentEmailRepository>();
        services.AddScoped<IEmailLinkClickRepository, EmailLinkClickRepository>();
        services.AddSingleton<IEmailLinkSigner, EmailLinkSigner>();
        services.AddScoped<IBackgroundJobScheduler, HangfireBackgroundJobScheduler>();
        services.AddScoped<EmailJobs>();
        services.AddScoped<PushNotificationJobs>();
        services.AddScoped<ChatMemoryExtractionJobs>();
        services.AddScoped<IAppConfiguration, AppConfiguration>();
        services.AddScoped<IPhotoDateExtractor, ExifPhotoDateExtractor>();
        services.AddScoped<IPhotoImageNormalizer, HeicToJpegPhotoImageNormalizer>();

        // Bound from config with ImagePolicy's own defaults as fallback, so an unconfigured
        // environment still enforces sane limits rather than silently having none.
        services.AddSingleton(new ImagePolicy(
            configuration.GetValue("ImagePolicy:MaxStoredLongEdge", ImagePolicy.DefaultMaxStoredLongEdge),
            configuration.GetValue("ImagePolicy:MaxUploadBytes", ImagePolicy.DefaultMaxUploadBytes),
            configuration.GetValue("ImagePolicy:MaxUploadMegapixels", ImagePolicy.DefaultMaxUploadMegapixels)));
        // Singleton: see VipsImageProcessor's own doc comment (shares one concurrency throttle
        // process-wide, holds no per-request state).
        services.AddSingleton<IImageProcessor, VipsImageProcessor>();

        services.AddScoped<IIdGenerator, GuidIdGenerator>();
        services.AddScoped<IClock, SystemClock>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();

        services.AddHttpClient<IUserInfoClient, OidcUserInfoClient>();
        services.AddHttpClient<IProfilePictureFetcher, HttpProfilePictureFetcher>();

        // LeadHub responds to a successful submission with a redirect to a "thanks"
        // page we have no use for — don't waste a round trip following it.
        services.AddHttpClient<ISupportBackend, LeadHubSupportBackend>()
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

        services.Configure<OpenAiOptions>(configuration.GetSection("OpenAi"));
        services.AddHttpClient<IAiChatBackend, OpenAiChatBackend>();
        services.AddHttpClient<IEmbeddingBackend, OpenAiEmbeddingBackend>();
        services.AddHttpClient<IChatMemoryExtractionBackend, OpenAiChatMemoryExtractionBackend>();

        // Singleton: wraps a single AmazonS3Client, which the AWS SDK documents as
        // thread-safe and designed for reuse/connection pooling across requests —
        // a deliberate exception to the default Scoped lifetime, not request state.
        services.Configure<StorageOptions>(configuration.GetSection("Storage"));
        services.Configure<ImgproxyOptions>(configuration.GetSection("Imgproxy"));
        services.AddSingleton<IPhotoStorage, MinioPhotoStorage>();

        services.Configure<ResendOptions>(configuration.GetSection("Resend"));
        services.Configure<SmtpOptions>(configuration.GetSection("Smtp"));
        // Singleton: parsed Scriban templates are immutable and safe to reuse across
        // concurrent renders; eagerly parsing all of them at construction means a template
        // syntax error fails fast at startup instead of on the first email send.
        services.AddSingleton<IEmailRenderer, ScribanEmailRenderer>();
        services.AddScoped<IEmailTemplateRenderer, EmailTemplateRenderer>();

        // Three-way fallback: Smtp:Host set (docker-compose's local Mailpit) wins first so
        // emails can be inspected in a real inbox during dev; otherwise Resend:ApiKey set
        // (staging/prod) sends for real; otherwise just log the composed email so the
        // send/persist pipeline is still exercisable with nothing configured at all.
        if (!string.IsNullOrEmpty(configuration["Smtp:Host"]))
        {
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        }
        else if (!string.IsNullOrEmpty(configuration["Resend:ApiKey"]))
        {
            services.AddHttpClient<IEmailSender, ResendEmailSender>();
        }
        else
        {
            services.AddScoped<IEmailSender, LoggingEmailSender>();
        }

        services.Configure<FirebaseOptions>(configuration.GetSection("Firebase"));
        if (!string.IsNullOrEmpty(configuration["Firebase:ServiceAccountJson"]))
        {
            // Singleton: see FirebasePushNotificationSender's own doc comment.
            services.AddSingleton<IPushNotificationSender, FirebasePushNotificationSender>();
        }
        else
        {
            services.AddScoped<IPushNotificationSender, LoggingPushNotificationSender>();
        }

        return services;
    }
}
