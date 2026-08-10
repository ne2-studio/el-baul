using ElBaul.Ports.Shared;

namespace ElBaul.Ports.Input;

public interface ISupportManager
{
    Task<Result> SubmitAsync(string category, string message, string? technicalInfo);
}
