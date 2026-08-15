namespace ElBaul.Core.Analytics;

public interface IDailyUserBaulActivityAggregationJob
{
    Task AggregateYesterdayAsync();
}
