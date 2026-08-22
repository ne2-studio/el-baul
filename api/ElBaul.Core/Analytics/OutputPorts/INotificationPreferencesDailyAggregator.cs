namespace ElBaul.Core.Analytics.OutputPorts;

public interface INotificationPreferencesDailyAggregator
{
    Task AggregateForDateAsync(DateOnly date);
}
