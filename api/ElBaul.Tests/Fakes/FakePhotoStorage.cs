using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakePhotoStorage : IPhotoStorage
{
    public List<string> SavedKeys { get; } = [];
    public List<string> DeletedKeys { get; } = [];

    public Task SaveAsync(string key, Stream content, string contentType)
    {
        SavedKeys.Add(key);
        return Task.CompletedTask;
    }

    public Task<string> GetImageUrl(string key, ImagePlacement placement) =>
        Task.FromResult($"https://imgproxy.test/{placement}/{key}");

    public Task DeleteAsync(string key)
    {
        DeletedKeys.Add(key);
        return Task.CompletedTask;
    }

    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}
