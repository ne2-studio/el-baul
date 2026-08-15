using Ne2Studio.Common;
namespace ElBaul.Core.Support;
public interface ISupportManager
{
    Task<Result> SubmitAsync(string category, string message, string? technicalInfo);
}
