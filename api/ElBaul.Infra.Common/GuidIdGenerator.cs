using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Infra;

public class GuidIdGenerator : IIdGenerator
{
    public Guid NewId() => Guid.NewGuid();
}
