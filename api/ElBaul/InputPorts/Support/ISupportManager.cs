using ElBaul.InputPorts.Support;
using ElBaul.Shared;
namespace ElBaul.InputPorts.Support;
public interface ISupportManager
{
    Task<Result> SubmitAsync(string category, string message, string? technicalInfo);
}
