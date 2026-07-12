using ElBaul.Ports.Output;

namespace ElBaul.Infra;

public class GuidIdGenerator : IIdGenerator
{
    public Guid NewId() => Guid.NewGuid();
}
