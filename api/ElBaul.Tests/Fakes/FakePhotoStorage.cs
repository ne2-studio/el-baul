using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakePhotoStorage : IPhotoStorage
{
    public List<string> SavedKeys { get; } = [];

    public Task SaveAsync(string key, Stream content, string contentType)
    {
        SavedKeys.Add(key);
        return Task.CompletedTask;
    }

    public Task<string> GetSignedUrlAsync(string key, TimeSpan expiresIn) =>
        Task.FromResult($"https://storage.test/{key}?expires={expiresIn.TotalSeconds}");

    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}
