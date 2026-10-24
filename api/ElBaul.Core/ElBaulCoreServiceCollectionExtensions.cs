using ElBaul.Core.Admin;
using ElBaul.Core.Admin.Application;
using ElBaul.Core.Analytics;
using ElBaul.Core.Analytics.Application;
using ElBaul.Core.Bauls;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chapters;
using ElBaul.Core.Chapters.Application;
using ElBaul.Core.Chat;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Contributions;
using ElBaul.Core.Contributions.Application;
using ElBaul.Core.Feed;
using ElBaul.Core.Feed.Application;
using ElBaul.Core.Moderation;
using ElBaul.Core.Moderation.Application;
using ElBaul.Core.Notifications;
using ElBaul.Core.Notifications.Application;
using ElBaul.Core.Personas;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Photos;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos;
using ElBaul.Core.Recuerdos.Application;
using ElBaul.Core.Sharing;
using ElBaul.Core.Sharing.Application;
using ElBaul.Core.Support;
using ElBaul.Core.Support.Application;
using ElBaul.Core.TvMode;
using ElBaul.Core.TvMode.Application;
using ElBaul.Core.Users;
using ElBaul.Core.Users.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Core;

/// <summary>
/// Wires the application layer (managers, services, projectors, listeners, background-job
/// entry points) onto the ports every host provides. A host calls this once and registers its
/// own adapters for the output ports (ElBaul.Infra or ElBaul.Infra.Lite), so the real host and
/// the in-memory one run the exact same application graph.
/// </summary>
public static class ElBaulCoreServiceCollectionExtensions
{
    public static IServiceCollection AddElBaulCore(this IServiceCollection services, IConfiguration configuration)
    {
        // Register application services
        services.AddScoped<BaulAccessService>();
        services.AddScoped<IBaulAuthorizer>(sp => sp.GetRequiredService<BaulAccessService>());
        services.AddScoped<AuthorInfoProjector>();
        services.AddScoped<CoverUrlResolver>();
        services.AddScoped<IChapterPhotoCountListener, ChapterPhotoCountListener>();
        services.AddScoped<IBaulPhotoCoverListener, BaulPhotoCoverListener>();
        services.AddScoped<PhotoLifecycleService>();
        services.AddScoped<PhotoFileService>();
        services.AddScoped<PhotoUploadWorkflow>();
        // IPhotoMergeListener: every feature that reacts to a duplicate-photo merge — see its own
        // doc comment for why these are several registrations of one shared interface, resolved
        // as a collection, rather than one interface per feature.
        services.AddScoped<IPhotoMergeListener, SharedLinkPhotoMergeListener>();
        services.AddScoped<IPhotoMergeListener, BaulCoverPhotoMergeListener>();
        services.AddScoped<IPhotoMergeListener, ChapterCoverPhotoMergeListener>();
        services.AddScoped<IPhotoMergeListener, PersonaAvatarPhotoMergeListener>();
        services.AddScoped<IPhotoMergeListener, PhotoPersonaTagMergeListener>();
        services.AddScoped<IPhotoMergeListener, RecuerdoPhotoMergeListener>();
        services.AddScoped<PhotoDuplicateMergeService>();
        services.AddScoped<IPhotoDtoProjector, PhotoDtoProjector>();
        services.AddScoped<IPersonaDtoProjector, PersonaDtoProjector>();
        services.AddScoped<IBaulManager, BaulManager>();
        services.AddScoped<IPersonaManager, PersonaManager>();
        services.AddScoped<IPersonaRelationshipManager, PersonaRelationshipManager>();
        services.AddScoped<IPersonaSpouseRelationshipManager, PersonaSpouseRelationshipManager>();
        services.AddScoped<IRemovalRequestManager, RemovalRequestManager>();
        services.AddScoped<IChapterManager, ChapterManager>();
        services.AddScoped<IPhotoManager, PhotoManager>();
        services.AddScoped<IPhotoReadManager, PhotoReadManager>();
        services.AddScoped<IMyPhotosReadManager, MyPhotosReadManager>();
        services.AddScoped<IRecuerdoManager, RecuerdoManager>();
        services.AddScoped<IBaulFeedManager, BaulFeedManager>();
        services.AddScoped<IPhotoPersonaTagManager, PhotoPersonaTagManager>();
        services.AddScoped<IUserManager, UserManager>();
        services.AddScoped<IPushNotificationManager, PushNotificationManager>();
        services.AddScoped<ISupportManager, SupportManager>();
        services.AddScoped<IContributionsManager, ContributionsManager>();
        services.AddScoped<IRelevantRecuerdoSelector, RelevantRecuerdoSelector>();
        services.AddScoped<IRelevantChatMemorySelector, RelevantChatMemorySelector>();
        services.AddScoped<IChatContextBuilder, ChatContextBuilder>();
        services.AddScoped<IChatManager, ChatManager>();
        services.AddScoped<IChatMemoryManager, ChatMemoryManager>();
        services.AddScoped<IChatMemoryExtractionManager, ChatMemoryExtractionManager>();
        services.AddScoped<ISharedLinkManager, SharedLinkManager>();
        services.AddScoped<IPersonaInviteManager, PersonaInviteManager>();
        services.AddScoped<ITvSessionManager, TvSessionManager>();
        services.AddScoped<ITvPairingManager, TvPairingManager>();

        // "Ai" costs a real AI call every time the chat opens with no history and can fail;
        // "Static" (the default) is deterministic templates filled from the baúl's own
        // personas/capítulos and never fails. See ISuggestedQuestionsStrategy.
        if (string.Equals(configuration["Features:ChatSuggestionsStrategy"], "Ai", StringComparison.OrdinalIgnoreCase))
            services.AddScoped<ISuggestedQuestionsStrategy, AiSuggestedQuestionsStrategy>();
        else
            services.AddScoped<ISuggestedQuestionsStrategy, StaticSuggestedQuestionsStrategy>();
        services.AddScoped<IAdminManager, AdminManager>();
        services.AddScoped<IDailyUserBaulActivityAggregationJob, DailyUserBaulActivityAggregationJob>();
        services.AddScoped<IDailyUserActivityAggregationJob, DailyUserActivityAggregationJob>();
        services.AddScoped<IDailyNotificationPreferencesAggregationJob, DailyNotificationPreferencesAggregationJob>();
        services.AddScoped<IUserSessionManager, UserSessionManager>();
        services.AddScoped<IWelcomeEmailManager, WelcomeEmailManager>();
        services.AddScoped<DigestActivityPolicy>();
        services.AddScoped<DigestAttributionResolver>();
        services.AddScoped<IWeeklyDigestManager, WeeklyDigestManager>();
        services.AddScoped<IPushDigestManager, PushDigestManager>();
        services.AddScoped<EmailDeliveryCoordinator>();

        return services;
    }
}
