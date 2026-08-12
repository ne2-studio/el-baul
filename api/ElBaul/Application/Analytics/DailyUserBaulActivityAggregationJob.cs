using ElBaul.OutputPorts.Analytics;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application.Analytics;

public class DailyUserBaulActivityAggregationJob(
    IUserBaulActivityDailyAggregator aggregator,
    IAppConfiguration appConfiguration,
    IClock clock,
    ILogger<DailyUserBaulActivityAggregationJob> logger) : InputPorts.Analytics.IDailyUserBaulActivityAggregationJob
{
    public async Task AggregateYesterdayAsync()
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(appConfiguration.FunctionalTimeZoneId);
        var nowUtc = DateTime.SpecifyKind(clock.UtcNow(), DateTimeKind.Utc);
        var localToday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone));
        var date = localToday.AddDays(-1);

        logger.LogInformation(
            "Aggregating user baul activity for {Date} using functional timezone {TimeZoneId}",
            date, appConfiguration.FunctionalTimeZoneId);

        await aggregator.AggregateForDateAsync(date);
    }
}
