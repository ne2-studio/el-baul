using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
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
    public void Build_ShouldAppendAnExplicitCropWindow_WhenZoomedIn()
    {
        // Square source, square target (persona-avatar) — the degenerate case where the
        // crop window's own width/height happen to equal 1/scale on both axes.
        var crop = new ImageCrop(0.3m, 0.7m, 1.5m);

        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options, crop, new ImageDimensions(1000, 1000));

        // width = height = 1/1.5 = 0.6667; left = 0.3*(1-0.6667) = 0.1; top = 0.7*(1-0.6667) = 0.2333
        // — same window PhotoCropStep.tsx's CSS preview shows for this crop.
        Assert.Contains("/pr:persona-avatar/crop:0.6667:0.6667:nowe:0.1:0.2333/gravity:ce/", result);
    }

    [Fact]
    public void Build_ShouldSkewTheCropWindow_WhenSourceAspectRatioDiffersFromTarget()
    {
        // A 1600x1000 (16:10) source cropped for a chapter cover (8:5 = 1.6, same ratio as
        // 1600:1000) is actually aspect-matched here, so pick a source that genuinely isn't:
        // a 2000x1000 (2:1) source is wider than the 8:5 target, so "cover" must already trim
        // some width even before any user zoom — regression for the bug the previous fix
        // (gravity:fp reapplied after crop) never actually addressed: the crop window's shape
        // depends on the source's own aspect ratio, not just crop.Scale.
        var crop = new ImageCrop(0.5m, 0.5m, 1m);

        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.ChapterCover, Options, crop, new ImageDimensions(2000, 1000));

        // sourceAspectRatio (2) > targetAspectRatio (1.6): height is untouched (1/scale = 1,
        // i.e. "0" — imgproxy's spelling for "full axis"), width is trimmed to 1.6/2 = 0.8.
        Assert.Contains("/pr:chapter-cover/crop:0.8:0:nowe:0.1:0/gravity:ce/", result);
    }

    [Fact]
    public void Build_ShouldOmitTheCropWindowAxes_WhenNothingNeedsTrimming()
    {
        // Square source, square target, no zoom — nothing to crop on either axis.
        var crop = new ImageCrop(0.3m, 0.7m, 1m);

        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options, crop, new ImageDimensions(1000, 1000));

        Assert.Contains("/pr:persona-avatar/crop:0:0:nowe:0:0/gravity:ce/", result);
    }

    [Fact]
    public void Build_ShouldOmitGravityAndCrop_WhenCropIsNull()
    {
        var result = ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options);

        Assert.DoesNotContain("gravity:", result);
        Assert.DoesNotContain("crop:", result);
    }

    [Fact]
    public void Build_ShouldThrow_WhenCropIsSetWithoutSourceDimensions()
    {
        var crop = new ImageCrop(0.3m, 0.7m, 1.5m);

        Assert.Throws<ArgumentNullException>(() =>
            ImgproxyUrlBuilder.Build("bucket", "key.jpg", ImagePlacement.PersonaAvatar, Options, crop));
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
