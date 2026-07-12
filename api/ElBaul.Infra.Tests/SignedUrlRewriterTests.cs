using ElBaul.Infra;

namespace ElBaul.Infra.Tests;

public class SignedUrlRewriterTests
{
    [Fact]
    public void Rewrite_ShouldReplaceSchemeHostAndPort_ButKeepPathAndQuery()
    {
        var internalUrl = "http://minio:9000/el-baul-photos/user-1/photo.jpg?X-Amz-Signature=abc123&X-Amz-Expires=3600";

        var result = SignedUrlRewriter.Rewrite(internalUrl, "http://localhost:9000");

        Assert.Equal(
            "http://localhost:9000/el-baul-photos/user-1/photo.jpg?X-Amz-Signature=abc123&X-Amz-Expires=3600",
            result);
    }

    [Fact]
    public void Rewrite_ShouldSwitchScheme_WhenPublicEndpointUsesHttps()
    {
        var internalUrl = "http://minio:9000/bucket/key.jpg?sig=xyz";

        var result = SignedUrlRewriter.Rewrite(internalUrl, "https://cdn.example.com");

        Assert.StartsWith("https://cdn.example.com/bucket/key.jpg", result);
    }

    [Fact]
    public void Rewrite_ShouldUseThePublicEndpointsPort()
    {
        var internalUrl = "http://minio:9000/bucket/key.jpg?sig=xyz";

        var result = SignedUrlRewriter.Rewrite(internalUrl, "http://localhost:8443");

        Assert.StartsWith("http://localhost:8443/", result);
    }
}
