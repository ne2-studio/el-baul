using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

/// <summary>
/// Returns the given id on the first call (for assertions to key off), then falls
/// back to random ids so operations that generate several ids in one call (e.g. a
/// shared user plus an activity) don't collide with each other or with seeded data.
/// </summary>
public class StaticIdGenerator(Guid id) : IIdGenerator
{
    private bool _used;

    public Guid NewId()
    {
        if (_used) return Guid.NewGuid();
        _used = true;
        return id;
    }
}
