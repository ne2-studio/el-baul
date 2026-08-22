namespace ElBaul.Core.Analytics;

public interface IDailyUserActivityAggregationJob
{
    Task AggregateYesterdayAsync();
}
