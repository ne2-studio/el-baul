using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

// Deterministic, no real OpenAI call: each text is embedded as a bag-of-words vector over a
// fixed vocabulary supplied by the test, so cosine similarity in ChatManager behaves
// predictably (e.g. "asturias" and "viaje" text ranks above unrelated text) without needing
// real embeddings.
public class FakeEmbeddingBackend(IReadOnlyList<string> vocabulary) : IEmbeddingBackend
{
    public string ModelId { get; set; } = "fake-embedding-model";
    public Result<float[]>? NextEmbedResult { get; set; }
    public Result<IReadOnlyList<float[]>>? NextEmbedManyResult { get; set; }

    private float[] Vectorize(string text) =>
        vocabulary.Select(word => text.Contains(word, StringComparison.OrdinalIgnoreCase) ? 1f : 0f).ToArray();

    public Task<Result<float[]>> EmbedAsync(string text) =>
        Task.FromResult(NextEmbedResult ?? Result.Success(Vectorize(text)));

    public Task<Result<IReadOnlyList<float[]>>> EmbedManyAsync(IReadOnlyList<string> texts) =>
        Task.FromResult(NextEmbedManyResult ?? Result.Success<IReadOnlyList<float[]>>(texts.Select(Vectorize).ToList()));
}
