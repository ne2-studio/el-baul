using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Maintenance.Tests;

internal sealed class FixedClock(DateTime now) : IClock
{
    public DateTime UtcNow() => now;
}
