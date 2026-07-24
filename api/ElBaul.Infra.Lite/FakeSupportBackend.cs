using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class FakeSupportBackend : ISupportBackend
{
    private readonly Lock _lock = new();

    public List<SupportSubmission> Submissions { get; } = [];
    public Result NextResult { get; set; } = Result.Success();

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its
    // use in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add
    // is not safe under concurrent writers.
    public Task<Result> SubmitAsync(SupportSubmission submission)
    {
        lock (_lock) Submissions.Add(submission);
        return Task.FromResult(NextResult);
    }
}
