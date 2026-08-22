using ElBaul.Core.Photos.Domain;
using ElBaul.Infra.PhotoStorage;
using ElBaul.Core.Photos.OutputPorts;
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
            "http://imgproxy.test/YXuHLujvv6XoelpHsptbaH7GOvmlw_leKt1I8588_Os/pr:photo-grid-thumbnail/czM6Ly90ZXN0LWJ1Y2tldC90ZXN0LWtleS5qcGc",
            result);
    }

    [Fact]
    public void Build_ShouldSelectADifferentPreset_PerPlacement()
    {
        var thumbnail = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PhotoGridThumbnail, Options);
        var full = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PhotoFull, Options);

        Assert.Contains("/pr:photo-grid-thumbnail/", thumbnail);
        Assert.Contains("/pr:photo-full/", full);
        Assert.NotEqual(thumbnail, full);
    }

    [Fact]
    public void Build_ShouldSelectTheFeaturedChapterCoverPreset_ForChapterCoverFeatured()
    {
        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.ChapterCoverFeatured, Options);

        Assert.Contains("/pr:chapter-cover-featured/", result);
    }

    [Fact]
    public void Build_ShouldAppendGravityAndCrop_WhenZoomedIn()
    {
        var crop = new ImageCrop(0.3m, 0.7m, 1.5m);

        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options, crop);

        Assert.Contains("/pr:persona-avatar/crop:0.6667:0.6667:fp:0.3:0.7/gravity:ce/", result);
    }

    [Fact]
    public void Build_ShouldOmitCrop_WhenScaleIsExactlyOne()
    {
        // A relative crop:1:1 would be misread by imgproxy as an *absolute* 1x1 pixel
        // crop (values >= 1 mean pixels, not a fraction) — verified empirically against
        // a running imgproxy. Scale == 1 (no zoom) must skip the crop option entirely.
        var crop = new ImageCrop(0.3m, 0.7m, 1m);

        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options, crop);

        Assert.Equal(
            "http://imgproxy.test/_wqMEBNWP9cjZ0zfF83TMmZfCRmv9MGcGZvu4FI3y0I/pr:persona-avatar/gravity:fp:0.3:0.7/czM6Ly9idWNrZXQva2V5LmpwZw",
            result);
        Assert.DoesNotContain("crop:", result);
    }

    [Fact]
    public void Build_ShouldOmitGravityAndCrop_WhenCropIsNull()
    {
        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options);

        Assert.DoesNotContain("gravity:fp", result);
        Assert.DoesNotContain("crop:", result);
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
