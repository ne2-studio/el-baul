namespace ElBaul.Core.Analytics.OutputPorts;

public interface IUserActivityDailyAggregator
{
    Task AggregateForDateAsync(DateOnly date);
}
