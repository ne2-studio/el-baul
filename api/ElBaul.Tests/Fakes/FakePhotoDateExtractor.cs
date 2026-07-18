using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakePhotoDateExtractor : IPhotoDateExtractor
{
    public (int Year, int Month, int Day)? NextResult { get; set; }

    public (int Year, int Month, int Day)? TryExtractDate(Stream content) => NextResult;
}
