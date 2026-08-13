using ElBaul.Application.Photos;

namespace ElBaul.Tests.Application.Photos;

public class ImagePolicyTests
{
    private readonly ImagePolicy _policy = new(MaxStoredLongEdge: 4096, MaxUploadBytes: 1000, MaxUploadMegapixels: 1);

    [Theory]
    [InlineData(4000, 3000, false)]
    [InlineData(4096, 3072, false)]
    [InlineData(5000, 3000, true)]
    [InlineData(12000, 9000, true)]
    public void NeedsNormalization_MatchesTheLongEdgeLimit(int width, int height, bool expected)
    {
        Assert.Equal(expected, _policy.NeedsNormalization(width, height));
    }

    [Fact]
    public void ComputeNormalizedSize_ScalesTheExampleFromTheTicket()
    {
        var (width, height) = _policy.ComputeNormalizedSize(12000, 9000);

        Assert.Equal(4096, width);
        Assert.Equal(3072, height);
    }

    [Theory]
    [InlineData(4000, 3000)]
    [InlineData(4096, 3072)]
    public void ComputeNormalizedSize_ReturnsTheInputUnchanged_WhenAlreadyCompliant(int width, int height)
    {
        var (resultWidth, resultHeight) = _policy.ComputeNormalizedSize(width, height);

        Assert.Equal(width, resultWidth);
        Assert.Equal(height, resultHeight);
    }

    [Fact]
    public void ExceedsUploadBytes_IsTrue_OnlyAboveTheLimit()
    {
        Assert.False(_policy.ExceedsUploadBytes(1000));
        Assert.True(_policy.ExceedsUploadBytes(1001));
    }

    [Fact]
    public void ExceedsUploadMegapixels_IsTrue_OnlyAboveTheLimit()
    {
        Assert.False(_policy.ExceedsUploadMegapixels(1000, 1000)); // exactly 1 MP
        Assert.True(_policy.ExceedsUploadMegapixels(1001, 1000));
    }

    [Fact]
    public void DefaultConstructor_UsesTheTicketsInitialValues()
    {
        var policy = new ImagePolicy();

        Assert.Equal(4096, policy.MaxStoredLongEdge);
        Assert.Equal(25_000_000, policy.MaxUploadBytes);
        Assert.Equal(120, policy.MaxUploadMegapixels);
    }
}
