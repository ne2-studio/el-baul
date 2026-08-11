using ElBaul.OutputPorts.Shared;
namespace ElBaul.Tests.Fakes;

public class StaticClock : IClock
{
    private readonly DateTime _utcNow = DateTime.UtcNow;

    public DateTime UtcNow() => _utcNow;
}
