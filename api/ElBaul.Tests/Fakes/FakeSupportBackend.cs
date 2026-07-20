using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakeSupportBackend : ISupportBackend
{
    public List<SupportSubmission> Submissions { get; } = [];
    public Result NextResult { get; set; } = Result.Success();

    public Task<Result> SubmitAsync(SupportSubmission submission)
    {
        Submissions.Add(submission);
        return Task.FromResult(NextResult);
    }
}
