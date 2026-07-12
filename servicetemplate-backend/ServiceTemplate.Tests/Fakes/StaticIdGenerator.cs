using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Tests.Fakes;

public class StaticIdGenerator(Guid id) : IIdGenerator
{
    public Guid NewId()
    {
        return id;
    }
}
