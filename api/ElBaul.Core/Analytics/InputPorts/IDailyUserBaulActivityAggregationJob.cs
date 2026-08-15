namespace ElBaul.Core.Analytics.InputPorts;

public interface IDailyUserBaulActivityAggregationJob
{
    Task AggregateYesterdayAsync();
}
