using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillRecuerdoEmbeddingsCommandTests
{
    private static readonly DateTime Now = new(2026, 7, 27, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task RunAsync_WithDryRun_CountsStaleRecuerdosWithoutCallingEmbeddingBackend()
    {
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var embeddingRepository = new InMemoryRecuerdoEmbeddingRepository();
        await recuerdoRepository.CreateAsync(CreateRecuerdo("Texto pendiente"));
        var embeddingBackend = new RecordingEmbeddingBackend("model-v1");

        var command = new BackfillRecuerdoEmbeddingsCommand(
            recuerdoRepository, embeddingRepository, embeddingBackend, new FixedClock(Now),
            NullLogger<BackfillRecuerdoEmbeddingsCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        Assert.Empty(embeddingBackend.RequestedBatches);
        Assert.Empty(await embeddingRepository.GetAllAsync());
    }

    [Fact]
    public async Task RunAsync_EmbedsOnlyMissingOrStaleRecuerdos()
    {
        var fresh = CreateRecuerdo("Ya actualizado");
        var missing = CreateRecuerdo("Falta embedding");
        var stale = CreateRecuerdo("Embedding antiguo");
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        foreach (var recuerdo in new[] { fresh, missing, stale })
            await recuerdoRepository.CreateAsync(recuerdo);

        var embeddingRepository = new InMemoryRecuerdoEmbeddingRepository();
        await embeddingRepository.CreateManyAsync([
            new(fresh.Id, fresh.BaulId, [1f], "model-v2", Now),
            new(stale.Id, stale.BaulId, [2f], "old-model", Now)
        ]);
        var embeddingBackend = new RecordingEmbeddingBackend("model-v2")
        {
            NextResult = Result.Success<IReadOnlyList<float[]>>([[0.1f], [0.2f]])
        };

        var command = new BackfillRecuerdoEmbeddingsCommand(
            recuerdoRepository, embeddingRepository, embeddingBackend, new FixedClock(Now),
            NullLogger<BackfillRecuerdoEmbeddingsCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var embeddings = (await embeddingRepository.GetAllAsync()).ToDictionary(e => e.RecuerdoId);
        Assert.Equal(0, exitCode);
        Assert.Single(embeddingBackend.RequestedBatches);
        Assert.Equal([missing.Text, stale.Text], embeddingBackend.RequestedBatches.Single());
        Assert.Equal("model-v2", embeddings[missing.Id].Model);
        Assert.Equal("model-v2", embeddings[stale.Id].Model);
        Assert.Equal(Now, embeddings[missing.Id].CreatedAt);
        Assert.Equal(Now, embeddings[stale.Id].CreatedAt);
        Assert.Equal([1f], embeddings[fresh.Id].Vector);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailureWhenEmbeddingBackendFails()
    {
        var recuerdoRepository = new InMemoryRecuerdoRepository();
        var embeddingRepository = new InMemoryRecuerdoEmbeddingRepository();
        await recuerdoRepository.CreateAsync(CreateRecuerdo("No se puede embeber"));
        var embeddingBackend = new RecordingEmbeddingBackend("model-v1")
        {
            NextResult = Result.Failure<IReadOnlyList<float[]>>(ApplicationError.ExternalDependencyUnavailable("provider failed"))
        };

        var command = new BackfillRecuerdoEmbeddingsCommand(
            recuerdoRepository, embeddingRepository, embeddingBackend, new FixedClock(Now),
            NullLogger<BackfillRecuerdoEmbeddingsCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
        Assert.Empty(await embeddingRepository.GetAllAsync());
    }

    private static Recuerdo CreateRecuerdo(string text) =>
        new(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(Guid.NewGuid()), new UserId("user-1"), text, Now);

    private sealed class RecordingEmbeddingBackend(string modelId) : IEmbeddingBackend
    {
        public string ModelId { get; } = modelId;
        public List<IReadOnlyList<string>> RequestedBatches { get; } = [];
        public Result<IReadOnlyList<float[]>>? NextResult { get; init; }

        public Task<Result<float[]>> EmbedAsync(string text) =>
            Task.FromResult(Result.Success(new[] { 1f }));

        public Task<Result<IReadOnlyList<float[]>>> EmbedManyAsync(IReadOnlyList<string> texts)
        {
            RequestedBatches.Add(texts.ToList());
            return Task.FromResult(NextResult ?? Result.Success<IReadOnlyList<float[]>>(
                texts.Select((_, index) => new[] { (float)index }).ToList()));
        }
    }
}
