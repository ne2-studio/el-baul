namespace ElBaul.Core.Analytics;

public interface IDailyNotificationPreferencesAggregationJob
{
    Task AggregateYesterdayAsync();
}
