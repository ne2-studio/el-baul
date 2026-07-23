using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Output;

// Secondary port for whichever embedding provider turns recuerdo/query text into vectors
// (currently OpenAI, see ElBaul.Infra/OpenAiEmbeddingBackend). Kept separate from
// IAiChatBackend since it's a different OpenAI endpoint with a different request/response shape.
public interface IEmbeddingBackend
{
    // Tags persisted RecuerdoEmbedding rows so a model change is detected instead of mixing
    // vectors from different models in a similarity comparison — Core stays unaware of which
    // provider/config produces this string.
    string ModelId { get; }

    Task<Result<float[]>> EmbedAsync(string text);

    // Batched into a single HTTP call so backfilling embeddings for many new recuerdos at
    // once doesn't fire one request per recuerdo.
    Task<Result<IReadOnlyList<float[]>>> EmbedManyAsync(IReadOnlyList<string> texts);
}
