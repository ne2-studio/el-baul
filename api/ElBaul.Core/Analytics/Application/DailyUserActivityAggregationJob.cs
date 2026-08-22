using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Core.Analytics.Application;

public class DailyUserActivityAggregationJob(
    IUserActivityDailyAggregator aggregator,
    IAppConfiguration appConfiguration,
    IClock clock,
    ILogger<DailyUserActivityAggregationJob> logger) : IDailyUserActivityAggregationJob
{
    public async Task AggregateYesterdayAsync()
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(appConfiguration.FunctionalTimeZoneId);
        var nowUtc = DateTime.SpecifyKind(clock.UtcNow(), DateTimeKind.Utc);
        var localToday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone));
        var date = localToday.AddDays(-1);

        logger.LogInformation(
            "Aggregating user activity (1/7/30-day active users) for {Date} using functional timezone {TimeZoneId}",
            date, appConfiguration.FunctionalTimeZoneId);

        await aggregator.AggregateForDateAsync(date);
    }
}
