using ElBaul.Infra.Chat;
using ElBaul.Infra.Emails;
using ElBaul.Infra.Persistence;
using ElBaul.Infra.PhotoStorage;
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
        services.AddScoped<IChapterRepository, ChapterRepository>();
        services.AddScoped<IChapterListReadModel, ChapterListReadModel>();
        services.AddScoped<IPhotoRepository, PhotoRepository>();
        services.AddScoped<IPhotoListReadModel, PhotoListReadModel>();
        services.AddScoped<IRecuerdoRepository, RecuerdoRepository>();
        services.AddScoped<IRecuerdoListReadModel, RecuerdoListReadModel>();
        services.AddScoped<ISharedLinkRepository, SharedLinkRepository>();
        services.AddScoped<IBaulInviteLinkRepository, BaulInviteLinkRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IPhotoPersonaTagRepository, PhotoPersonaTagRepository>();
        services.AddScoped<IRecuerdoEmbeddingRepository, RecuerdoEmbeddingRepository>();
        services.AddScoped<IAdminRepository, AdminRepository>();
        services.AddScoped<ISentEmailRepository, SentEmailRepository>();
        services.AddScoped<IEmailLinkClickRepository, EmailLinkClickRepository>();
        services.AddSingleton<IEmailLinkSigner, EmailLinkSigner>();
        services.AddScoped<IBackgroundJobScheduler, HangfireBackgroundJobScheduler>();
        services.AddScoped<EmailJobs>();
        services.AddScoped<IAppConfiguration, AppConfiguration>();
        services.AddScoped<IPhotoDateExtractor, ExifPhotoDateExtractor>();
        services.AddScoped<IPhotoImageNormalizer, HeicToJpegPhotoImageNormalizer>();

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

        return services;
    }
}
