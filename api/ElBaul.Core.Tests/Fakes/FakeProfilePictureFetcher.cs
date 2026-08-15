using ElBaul.Core.Personas.OutputPorts;
namespace ElBaul.Tests.Fakes;

public class FakeProfilePictureFetcher(byte[]? bytes = null, bool throwOnFetch = false) : IProfilePictureFetcher
{
    public Task<byte[]?> TryFetchAsync(string url)
    {
        if (throwOnFetch) throw new HttpRequestException("Simulated fetch failure");
        return Task.FromResult(bytes);
    }
}
