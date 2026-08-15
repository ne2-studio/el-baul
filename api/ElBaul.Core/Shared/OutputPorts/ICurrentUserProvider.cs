using ElBaul.Domain;
namespace ElBaul.Core.Shared.OutputPorts;
public interface ICurrentUserProvider
{
    UserId GetUserId();
}
