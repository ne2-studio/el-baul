namespace ElBaul.OutputPorts.Analytics;

public interface IUserBaulActivityDailyAggregator
{
    Task AggregateForDateAsync(DateOnly date);
}
