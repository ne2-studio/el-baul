namespace ElBaul.Ports.Output;

public interface IRecuerdoEmbeddingRepository
{
    Task<IEnumerable<RecuerdoEmbedding>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Every embedding in the system, unscoped — used only by the one-off backfill
    /// command (see ElBaul.Maintenance/Commands/BackfillRecuerdoEmbeddingsCommand.cs).</summary>
    Task<IEnumerable<RecuerdoEmbedding>> GetAllAsync();

    /// <summary>Upsert by RecuerdoId (the primary key) — re-embedding a recuerdo whose stored
    /// embedding is from an older EmbeddingModel must replace that row, not collide with it.</summary>
    Task CreateManyAsync(IEnumerable<RecuerdoEmbedding> embeddings);
}
