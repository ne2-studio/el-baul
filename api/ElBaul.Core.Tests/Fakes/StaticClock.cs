using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Tests.Fakes;

public class StaticClock(DateTime? now = null) : IClock
{
    // Settable (not just constructor-fixed) so a test can advance time mid-test to exercise
    // expiry logic (e.g. TvSessionManagerTests' expired-session case) without needing a second
    // fake clock type.
    public DateTime Now { get; set; } = now ?? DateTime.UtcNow;

    public DateTime UtcNow() => Now;
}
