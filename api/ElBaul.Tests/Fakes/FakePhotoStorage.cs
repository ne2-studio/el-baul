using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakePhotoStorage : IPhotoStorage
{
    public List<string> SavedKeys { get; } = [];
    public List<string> DeletedKeys { get; } = [];
    private readonly Dictionary<string, byte[]> _content = new();

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        SavedKeys.Add(key);
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        _content[key] = buffer.ToArray();
    }

    public Task<Stream> OpenReadAsync(string key) =>
        Task.FromResult<Stream>(new MemoryStream(_content.GetValueOrDefault(key, [])));

    public Task<string> GetImageUrl(string key, ImagePlacement placement) =>
        Task.FromResult($"https://imgproxy.test/{placement}/{key}");

    public Task DeleteAsync(string key)
    {
        DeletedKeys.Add(key);
        return Task.CompletedTask;
    }

    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}
