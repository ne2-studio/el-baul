using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

public class SystemClock : IClock
{
    public DateTime UtcNow()
    {
        return DateTime.UtcNow;
    }
}
