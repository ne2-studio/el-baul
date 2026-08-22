using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

namespace ElBaul.Core.Analytics.Application;

public class UserSessionManager(
    IUserSessionRepository userSessionRepository,
    ICurrentUserProvider currentUserProvider,
    IAppConfiguration appConfiguration,
    IIdGenerator idGenerator,
    IClock clock) : IUserSessionManager
{
    // Kept in sync by hand with app/src/utils/platform.ts and app/src/utils/entrySource.ts —
    // there's no shared code between api/ and app/ (see root CLAUDE.md), so this allowlist is
    // this endpoint's own validation, not a mirror of an enum the client can't drift from.
    private static readonly string[] ValidPlatforms =
    [
        "android_native", "ios_native",
        "android_browser", "ios_browser", "desktop_browser",
        "android_pwa", "ios_pwa", "desktop_pwa",
    ];

    private static readonly string[] ValidEntrySources = ["email", "push", "link", "direct"];

    public async Task<Result> RecordSessionOpenAsync(string platform, string entrySource)
    {
        if (!ValidPlatforms.Contains(platform))
            return Result.Failure(ApplicationError.Validation($"'{platform}' is not a valid platform."));

        if (!ValidEntrySources.Contains(entrySource))
            return Result.Failure(ApplicationError.Validation($"'{entrySource}' is not a valid entry source."));

        var userId = currentUserProvider.GetUserId();

        // Same "convert to the functional timezone before taking the date" rule as
        // DailyUserBaulActivityAggregationJob, so a session opened at 23:50 in Madrid lands on
        // the right calendar day for DAU even though it's already past midnight UTC.
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(appConfiguration.FunctionalTimeZoneId);
        var openedAtUtc = DateTime.SpecifyKind(clock.UtcNow(), DateTimeKind.Utc);
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(openedAtUtc, timeZone));

        var session = new UserSessionOpen(idGenerator.NewId(), userId.Value, openedAtUtc, date, platform, entrySource);
        await userSessionRepository.RecordAsync(session);

        return Result.Success();
    }
}
