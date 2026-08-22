using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Core.Analytics.Application;

public class DailyNotificationPreferencesAggregationJob(
    INotificationPreferencesDailyAggregator aggregator,
    IAppConfiguration appConfiguration,
    IClock clock,
    ILogger<DailyNotificationPreferencesAggregationJob> logger) : IDailyNotificationPreferencesAggregationJob
{
    public async Task AggregateYesterdayAsync()
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(appConfiguration.FunctionalTimeZoneId);
        var nowUtc = DateTime.SpecifyKind(clock.UtcNow(), DateTimeKind.Utc);
        var localToday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone));
        var date = localToday.AddDays(-1);

        logger.LogInformation(
            "Aggregating notification preferences (email digest / push eligibility) for {Date} using functional timezone {TimeZoneId}",
            date, appConfiguration.FunctionalTimeZoneId);

        await aggregator.AggregateForDateAsync(date);
    }
}
