using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// ChatManager embeds recuerdos lazily, the first time a baúl's chat needs to rank them (see
/// ChatManager.FindRelevantRecuerdosAsync) — fine for a baúl's steady state, but it means the
/// very first real chat message after enabling the feature pays for embedding every recuerdo
/// that baúl already had, all at once. This command does that work ahead of time instead, for
/// every recuerdo in the system, so there's no first-message latency spike (or, for a baúl
/// with enough recuerdos to exceed OpenAI's ~2048-inputs-per-request limit, a failed batch)
/// once the feature is actually turned on for users.
///
/// Safe to re-run: a recuerdo whose stored embedding already matches the current
/// OpenAi:EmbeddingModel is skipped, so this only ever does the work of what's missing or
/// stale (e.g. after an embedding model change).
/// </summary>
[MaintenanceCommand("backfill-recuerdo-embeddings")]
public class BackfillRecuerdoEmbeddingsCommand(
    IRecuerdoRepository recuerdoRepository,
    IRecuerdoEmbeddingRepository recuerdoEmbeddingRepository,
    IEmbeddingBackend embeddingBackend,
    IClock clock,
    ILogger<BackfillRecuerdoEmbeddingsCommand> logger) : IMaintenanceCommand
{
    // Comfortably under OpenAI's per-request input-array limit for the embeddings endpoint,
    // and keeps a single failed batch small relative to the whole backfill.
    private const int BatchSize = 200;

    public async Task<int> RunAsync(bool dryRun)
    {
        var recuerdos = (await recuerdoRepository.GetAllAsync()).ToList();
        var existingEmbeddings = (await recuerdoEmbeddingRepository.GetAllAsync())
            .ToDictionary(e => e.RecuerdoId);

        var stale = recuerdos
            .Where(r => !existingEmbeddings.TryGetValue(r.Id, out var existing) || existing.Model != embeddingBackend.ModelId)
            .ToList();

        logger.LogInformation(
            "backfill-recuerdo-embeddings: {Total} recuerdo(s) total, {Stale} missing an up-to-date embedding{DryRunSuffix}",
            recuerdos.Count, stale.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var embedded = 0;
        var failed = 0;

        foreach (var batch in stale.Chunk(BatchSize))
        {
            if (dryRun)
            {
                logger.LogInformation(
                    "Would embed {Count} recuerdo(s): {RecuerdoIds}",
                    batch.Length, string.Join(", ", batch.Select(r => r.Id)));
                embedded += batch.Length;
                continue;
            }

            try
            {
                var embedResult = await embeddingBackend.EmbedManyAsync(batch.Select(r => r.Text).ToList());
                if (embedResult.IsFailure)
                {
                    failed += batch.Length;
                    logger.LogError(
                        "Batch of {Count} recuerdo(s) failed to embed, leaving them as-is: {Error}",
                        batch.Length, embedResult.Error);
                    continue;
                }

                var now = clock.UtcNow();
                var newEmbeddings = batch.Zip(embedResult.Value, (recuerdo, vector) =>
                    new RecuerdoEmbedding(recuerdo.Id, recuerdo.BaulId, vector, embeddingBackend.ModelId, now)).ToList();
                await recuerdoEmbeddingRepository.CreateManyAsync(newEmbeddings);
                embedded += newEmbeddings.Count;

                logger.LogInformation("Embedded {Count} recuerdo(s) in this batch", newEmbeddings.Count);
            }
            catch (Exception ex)
            {
                failed += batch.Length;
                logger.LogError(ex, "Batch of {Count} recuerdo(s) failed to embed, leaving them as-is", batch.Length);
            }
        }

        logger.LogInformation(
            "backfill-recuerdo-embeddings done. Embedded: {Embedded}, failed: {Failed}{DryRunSuffix}",
            embedded, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
