using ElBaul.OutputPorts.Shared;
namespace ElBaul.Infra;

public class SystemClock : IClock
{
    public DateTime UtcNow() => DateTime.UtcNow;
}
