using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakeAiChatBackend : IAiChatBackend
{
    public List<(string SystemPrompt, List<ChatTurn> History)> Calls { get; } = [];
    public Result<string> NextResult { get; set; } = Result.Success("Respuesta de prueba");

    public Task<Result<string>> GetReplyAsync(string systemPrompt, IEnumerable<ChatTurn> history)
    {
        Calls.Add((systemPrompt, history.ToList()));
        return Task.FromResult(NextResult);
    }
}
