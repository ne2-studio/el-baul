using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.OutputPorts;
public interface IRecuerdoEmbeddingRepository
{
    Task<IEnumerable<RecuerdoEmbedding>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Upsert by RecuerdoId (the primary key) — re-embedding a recuerdo whose stored
    /// embedding is from an older EmbeddingModel must replace that row, not collide with it.</summary>
    Task CreateManyAsync(IEnumerable<RecuerdoEmbedding> embeddings);

    Task DeleteAsync(RecuerdoId recuerdoId);
}
