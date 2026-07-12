using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Tests.Fakes;

public class StaticClock : IClock
{
    private readonly DateTime utcNow = DateTime.UtcNow;

    public DateTime UtcNow()
    {
        return utcNow;
    }
}
