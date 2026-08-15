namespace ElBaul.Core.Analytics.OutputPorts;

public interface IUserBaulActivityDailyAggregator
{
    Task AggregateForDateAsync(DateOnly date);
}
