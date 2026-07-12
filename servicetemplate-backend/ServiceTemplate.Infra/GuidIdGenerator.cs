using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

public class GuidIdGenerator : IIdGenerator
{
    public Guid NewId()
    {
        return Guid.NewGuid();
    }
}
