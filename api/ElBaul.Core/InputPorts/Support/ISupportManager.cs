using Ne2Studio.Common;
namespace ElBaul.InputPorts.Support;
public interface ISupportManager
{
    Task<Result> SubmitAsync(string category, string message, string? technicalInfo);
}
