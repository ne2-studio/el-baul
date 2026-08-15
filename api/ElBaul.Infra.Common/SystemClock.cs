using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Infra;

public class SystemClock : IClock
{
    public DateTime UtcNow() => DateTime.UtcNow;
}
