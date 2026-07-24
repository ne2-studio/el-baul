using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class FakeAiChatBackend : IAiChatBackend
{
    private readonly Lock _lock = new();

    public List<(string SystemPrompt, List<ChatTurn> History)> Calls { get; } = [];
    public Result<string> NextResult { get; set; } = Result.Success("Respuesta de prueba");

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its
    // use in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add
    // is not safe under concurrent writers.
    public Task<Result<string>> GetReplyAsync(string systemPrompt, IEnumerable<ChatTurn> history)
    {
        lock (_lock) Calls.Add((systemPrompt, history.ToList()));
        return Task.FromResult(NextResult);
    }
}
