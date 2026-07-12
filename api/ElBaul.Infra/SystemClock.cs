using ElBaul.Ports.Output;

namespace ElBaul.Infra;

public class SystemClock : IClock
{
    public DateTime UtcNow() => DateTime.UtcNow;
}
