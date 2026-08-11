using ElBaul.Shared;
namespace ElBaul.Infra;

public class GuidIdGenerator : IIdGenerator
{
    public Guid NewId() => Guid.NewGuid();
}
