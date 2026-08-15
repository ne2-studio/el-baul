using ElBaul.Core.Photos.OutputPorts;
namespace ElBaul.Infra.Lite;

public class FakePhotoImageNormalizer : IPhotoImageNormalizer
{
    public Task<NormalizedPhoto> NormalizeAsync(Stream content, string contentType, string fileName) =>
        Task.FromResult(new NormalizedPhoto(content, contentType, fileName));
}
