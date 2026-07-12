namespace ServiceTemplate.Ports.Output;

public interface IClock
{
    DateTime UtcNow();
}
