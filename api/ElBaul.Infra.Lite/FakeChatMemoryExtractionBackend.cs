using ElBaul.OutputPorts.Chat;
using Ne2Studio.Common;
namespace ElBaul.Infra.Lite;

public class FakeChatMemoryExtractionBackend : IChatMemoryExtractionBackend
{
    private readonly Lock _lock = new();

    public List<(string UserMessage, List<ExistingMemoryForExtraction> SimilarMemories)> Calls { get; } = [];

    // Defaults to no operations — the safe, silent-no-op shape most calls in tests/dev want
    // without opting in explicitly.
    public Result<IReadOnlyList<ChatMemoryOperation>> NextResult { get; set; } =
        Result.Success<IReadOnlyList<ChatMemoryOperation>>([]);

    public Task<Result<IReadOnlyList<ChatMemoryOperation>>> ExtractAsync(
        string userMessage, IReadOnlyList<ExistingMemoryForExtraction> similarMemories)
    {
        lock (_lock) Calls.Add((userMessage, similarMemories.ToList()));
        return Task.FromResult(NextResult);
    }
}
