using ElBaul.Ports.Output;

namespace ElBaul.Infra.Tests;

public class ImgproxyUrlBuilderTests
{
    private static readonly ImgproxyOptions Options = new()
    {
        BaseUrl = "http://imgproxy.test",
        Key = "0011223344556677",
        Salt = "0102030405060708"
    };

    [Fact]
    public void Build_ShouldProduceTheExpectedSignedUrl_ForKnownFixture()
    {
        var result = ImgproxyUrlBuilder.Build("test-bucket", "test-key.jpg", ImagePlacement.PhotoGridThumbnail, Options);

        Assert.Equal(
            "http://imgproxy.test/thLP2P3YXuzS8PRUlB-gNf07Shmx9YlFDpH34dh41Bg/photo-grid-thumbnail/czM6Ly90ZXN0LWJ1Y2tldC90ZXN0LWtleS5qcGc",
            result);
    }

    [Fact]
    public void Build_ShouldSelectADifferentPreset_PerPlacement()
    {
        var thumbnail = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PhotoGridThumbnail, Options);
        var full = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PhotoFull, Options);

        Assert.Contains("/photo-grid-thumbnail/", thumbnail);
        Assert.Contains("/photo-full/", full);
        Assert.NotEqual(thumbnail, full);
    }

    [Fact]
    public void Build_ShouldSelectTheFeaturedChapterCoverPreset_ForChapterCoverFeatured()
    {
        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.ChapterCoverFeatured, Options);

        Assert.Contains("/chapter-cover-featured/", result);
    }

    [Fact]
    public void Build_ShouldChangeTheSignature_WhenTheKeyDiffers()
    {
        var options2 = new ImgproxyOptions { BaseUrl = Options.BaseUrl, Key = "7766554433221100", Salt = Options.Salt };

        var result1 = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.ChapterCover, Options);
        var result2 = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.ChapterCover, options2);

        Assert.NotEqual(result1, result2);
    }

    [Fact]
    public void Build_ShouldPrefixTheConfiguredBaseUrl()
    {
        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.RemovalRequestThumbnail, Options);

        Assert.StartsWith("http://imgproxy.test/", result);
    }

    [Fact]
    public void Build_ShouldEmbedTheKeyLiterally_NotPercentEncoded()
    {
        // Regression: original upload file names can contain spaces, accents and
        // parens (e.g. "Sin título (1080 x 1080 px).png"). imgproxy's S3 source
        // resolver reads the key portion literally with no URL-decoding step —
        // percent-encoding it here made imgproxy look up the wrong (encoded) key
        // and 404, verified empirically against a running imgproxy container.
        var key = "admin-user/9ed8bf28-Sin título (1080 x 1080 px).png";

        var result = ImgproxyUrlBuilder.Build("el-baul-photos", key, ImagePlacement.ChapterCover, Options);

        var encodedSource = result.Split('/').Last();
        var decodedSource = DecodeBase64Url(encodedSource);

        Assert.Equal("s3://el-baul-photos/admin-user/9ed8bf28-Sin título (1080 x 1080 px).png", decodedSource);
    }

    private static string DecodeBase64Url(string value)
    {
        var padded = value.PadRight(value.Length + (4 - value.Length % 4) % 4, '=');
        var bytes = Convert.FromBase64String(padded.Replace('-', '+').Replace('_', '/'));
        return System.Text.Encoding.UTF8.GetString(bytes);
    }
}
