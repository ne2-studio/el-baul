using ElBaul.Core.Photos.OutputPorts;
namespace ElBaul.Infra.Lite;

public class FakePhotoImageNormalizer : IPhotoImageNormalizer
{
    public Task<NormalizedPhoto> NormalizeAsync(Stream content) =>
        Task.FromResult(new NormalizedPhoto(content));
}
