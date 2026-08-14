using ElBaul.InputPorts.Chat;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Chat;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillChatMemoriesCommandTests
{
    private static readonly DateTime Now = new(2026, 8, 13, 12, 0, 0, DateTimeKind.Utc);
    private static readonly BaulId BaulId = new(Guid.NewGuid());
    private static readonly UserId UserId = new("user-1");

    [Fact]
    public async Task RunAsync_WithDryRun_CountsPendingMessagesWithoutCallingExtraction()
    {
        var chatMessageRepository = new InMemoryChatMessageRepository();
        await chatMessageRepository.CreateAsync(CreateMessage("Mi abuelo era carpintero"));
        var chatMemoryRepository = new InMemoryChatMemoryRepository();
        var extractionManager = new RecordingChatMemoryExtractionManager();

        var command = new BackfillChatMemoriesCommand(
            chatMessageRepository, chatMemoryRepository, extractionManager,
            new StaticAppConfiguration(), NullLogger<BackfillChatMemoriesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        Assert.Empty(extractionManager.Calls);
    }

    [Fact]
    public async Task RunAsync_ExtractsOnlyUserMessagesNotYetBackedByAMemory()
    {
        var alreadyExtracted = CreateMessage("Ya procesado");
        var assistantReply = CreateMessage("Respuesta del asistente", ChatMessageRole.Assistant);
        var pending = CreateMessage("Mensaje pendiente");
        var chatMessageRepository = new InMemoryChatMessageRepository();
        foreach (var message in new[] { alreadyExtracted, assistantReply, pending })
            await chatMessageRepository.CreateAsync(message);

        var chatMemoryRepository = new InMemoryChatMemoryRepository();
        await chatMemoryRepository.CreateAsync(
            new ChatMemory(new ChatMemoryId(Guid.NewGuid()), BaulId, UserId, "Algo ya sabido", Now, Now, alreadyExtracted.Id));

        var extractionManager = new RecordingChatMemoryExtractionManager();
        var command = new BackfillChatMemoriesCommand(
            chatMessageRepository, chatMemoryRepository, extractionManager,
            new StaticAppConfiguration(), NullLogger<BackfillChatMemoriesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var call = Assert.Single(extractionManager.Calls);
        Assert.Equal(pending.Id, call.SourceMessageId);
        Assert.Equal(pending.Content, call.Text);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailure_WhenExtractionFails()
    {
        var message = CreateMessage("No se puede extraer");
        var chatMessageRepository = new InMemoryChatMessageRepository();
        await chatMessageRepository.CreateAsync(message);
        var chatMemoryRepository = new InMemoryChatMemoryRepository();
        var extractionManager = new RecordingChatMemoryExtractionManager
        {
            NextResult = Result.Failure(ApplicationError.ExternalDependencyUnavailable("provider failed"))
        };

        var command = new BackfillChatMemoriesCommand(
            chatMessageRepository, chatMemoryRepository, extractionManager,
            new StaticAppConfiguration(), NullLogger<BackfillChatMemoriesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
    }

    [Fact]
    public async Task RunAsync_FailsFast_WhenChatMemoryFeatureIsDisabled()
    {
        var chatMessageRepository = new InMemoryChatMessageRepository();
        await chatMessageRepository.CreateAsync(CreateMessage("mensaje"));
        var chatMemoryRepository = new InMemoryChatMemoryRepository();
        var extractionManager = new RecordingChatMemoryExtractionManager();

        var command = new BackfillChatMemoriesCommand(
            chatMessageRepository, chatMemoryRepository, extractionManager,
            new StaticAppConfiguration(chatMemoryEnabled: false), NullLogger<BackfillChatMemoriesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
        Assert.Empty(extractionManager.Calls);
    }

    private static ChatMessage CreateMessage(string content, ChatMessageRole role = ChatMessageRole.User) =>
        new(Guid.NewGuid(), BaulId, UserId, role, content, Now);

    private sealed class RecordingChatMemoryExtractionManager : IChatMemoryExtractionManager
    {
        public List<(Guid SourceMessageId, string Text)> Calls { get; } = [];
        public Result? NextResult { get; init; }

        public Task<Result> ExtractFromMessageAsync(BaulId baulId, UserId userId, Guid sourceMessageId, string text)
        {
            Calls.Add((sourceMessageId, text));
            return Task.FromResult(NextResult ?? Result.Success());
        }
    }
}
