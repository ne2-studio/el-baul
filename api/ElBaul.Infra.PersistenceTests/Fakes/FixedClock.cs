using ElBaul.Shared;
namespace ElBaul.Infra.PersistenceTests.Fakes;

// Mirrors ElBaul.Tests/Fakes/StaticClock.cs — this project has no ProjectReference to
// ElBaul.Tests (it's a test project, not something to depend on), so it carries its own copy
// rather than reaching across.
public class FixedClock : IClock
{
    private readonly DateTime _utcNow = DateTime.UtcNow;

    public DateTime UtcNow() => _utcNow;
}
