using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.PhotoStorage;

/// <summary>
/// Builds signed imgproxy URLs pointing at photos stored in MinIO, via imgproxy's native
/// S3 source support (s3://bucket/key) — imgproxy holds its own S3 credentials and reads
/// MinIO directly over the internal docker network, so this process never generates or
/// exposes a MinIO URL of any kind. Base resize/crop behavior is a named preset configured
/// server-side on imgproxy (see imgproxy/presets.conf), keyed by ImagePlacement. An
/// optional per-image ImageCrop overrides the preset's gravity with a focal point
/// (gravity:fp) and, when zoomed in, pre-crops a fractional region around that focal point
/// (crop:w:h:fp) before the preset's own fill/resize runs — used for persona avatars so the
/// user-chosen crop/zoom is resampled by imgproxy against the original resolution, instead
/// of the browser CSS-scaling an already-downloaded, already-decoded image. imgproxy's
/// `zoom` processing option would be the more direct fit, but it's Pro-only: verified
/// empirically against the OSS image (ghcr.io/imgproxy/imgproxy) that a `zoom:` option is
/// parsed without error yet silently has no effect (the source passes through unresized) —
/// `crop` with a relative (0-1) width/height achieves the same pre-crop-then-fill result and
/// is available in the free build. Since arbitrary processing options are now accepted
/// (IMGPROXY_ONLY_PRESETS=false — see imgproxy/Dockerfile), the preset must be referenced via
/// the "pr:" processing option rather than a bare name; the signing key/salt HMAC, not the
/// preset allowlist, is what keeps a leaked URL from being tampered with. Extracted as a pure
/// function so it's testable without a running imgproxy instance.
/// </summary>
public static class ImgproxyUrlBuilder
{
    public static string Build(string bucketName, string key, ImagePlacement placement, ImgproxyOptions options, ImageCrop? crop = null)
    {
        // imgproxy's S3 source resolver reads the key portion literally (no URL
        // percent-decoding), so the storage key — which can contain spaces/accents
        // from the original upload's file name — is embedded as-is, not escaped.
        // Verified empirically against a running imgproxy: a percent-encoded key
        // results in a literal (and therefore wrong, 404) S3 lookup.
        var source = $"s3://{bucketName}/{key}";
        var encodedSource = Base64UrlEncode(Encoding.UTF8.GetBytes(source));
        var processingOptions = $"pr:{PresetFor(placement)}";
        if (crop is not null)
        {
            var focalPoint = $"{FormatOption(crop.X)}:{FormatOption(crop.Y)}";
            // Declared after the preset reference, so it overrides the preset's own
            // gravity:sm — imgproxy applies same-named processing options in order,
            // last one wins.
            processingOptions += $"/gravity:fp:{focalPoint}";
            if (crop.Scale > 1m)
            {
                // crop's width/height are relative (0-1) fractions of the source image
                // here, never >= 1 — imgproxy treats a value >= 1 as an *absolute pixel
                // count* instead (verified empirically: crop:1:1 produced a 1x1 image),
                // which is exactly why this branch is skipped entirely at scale == 1.
                var fraction = FormatOption(1m / crop.Scale);
                processingOptions += $"/crop:{fraction}:{fraction}:fp:{focalPoint}";
            }
        }
        var path = $"/{processingOptions}/{encodedSource}";
        var signature = Sign(path, options.Key, options.Salt);

        return $"{options.BaseUrl.TrimEnd('/')}/{signature}{path}";
    }

    private static string FormatOption(decimal value) => value.ToString("0.####", CultureInfo.InvariantCulture);

    private static string PresetFor(ImagePlacement placement) => placement switch
    {
        ImagePlacement.PhotoGridThumbnail => "photo-grid-thumbnail",
        ImagePlacement.PhotoFull => "photo-full",
        ImagePlacement.ChapterCover => "chapter-cover",
        ImagePlacement.ChapterCoverFeatured => "chapter-cover-featured",
        ImagePlacement.RemovalRequestThumbnail => "removal-request-thumbnail",
        ImagePlacement.InvitationPreview => "invitation-preview",
        ImagePlacement.BaulCover => "baul-cover",
        ImagePlacement.PersonaAvatar => "persona-avatar",
        _ => throw new ArgumentOutOfRangeException(nameof(placement), placement, "Unknown image placement")
    };

    private static string Sign(string path, string hexKey, string hexSalt)
    {
        var keyBytes = Convert.FromHexString(hexKey);
        var saltBytes = Convert.FromHexString(hexSalt);
        var pathBytes = Encoding.UTF8.GetBytes(path);

        var message = new byte[saltBytes.Length + pathBytes.Length];
        Buffer.BlockCopy(saltBytes, 0, message, 0, saltBytes.Length);
        Buffer.BlockCopy(pathBytes, 0, message, saltBytes.Length, pathBytes.Length);

        using var hmac = new HMACSHA256(keyBytes);
        return Base64UrlEncode(hmac.ComputeHash(message));
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
