using Ne2Studio.Common;
namespace ElBaul.Core.Support.InputPorts;
public interface ISupportManager
{
    Task<Result> SubmitAsync(string category, string message, string? technicalInfo);
}
