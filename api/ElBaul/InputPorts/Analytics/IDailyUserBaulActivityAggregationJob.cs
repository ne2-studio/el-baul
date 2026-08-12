namespace ElBaul.InputPorts.Analytics;

public interface IDailyUserBaulActivityAggregationJob
{
    Task AggregateYesterdayAsync();
}
