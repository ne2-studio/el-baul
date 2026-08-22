using ElBaul.Domain;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using ElBaul.Core.Photos.OutputPorts;
namespace ElBaul.Infra.PhotoStorage;

/// <summary>
/// Builds signed imgproxy URLs pointing at photos stored in MinIO, via imgproxy's native
/// S3 source support (s3://bucket/key) — imgproxy holds its own S3 credentials and reads
/// MinIO directly over the internal docker network, so this process never generates or
/// exposes a MinIO URL of any kind. Base resize/crop behavior is a named preset configured
/// server-side on imgproxy (see imgproxy/presets.conf), keyed by ImagePlacement. An optional
/// per-image ImageCrop replaces the preset's own gravity with an explicit crop window
/// (crop:w:h:nowe:left:top, see BuildCropWindow) computed to reproduce, pixel-for-pixel,
/// what PhotoCropStep.tsx's CSS preview (object-position + transform/transform-origin) shows
/// the user in the browser — used for persona avatars, chapter covers and baúl covers so the
/// user-chosen crop/zoom is resampled by imgproxy against the original resolution, instead of
/// the browser CSS-scaling an already-downloaded, already-decoded image. imgproxy's own
/// `gravity:fp` always centers the focal point in the output (verified against imgproxy's
/// docs), which is a *different* crop model than the preview's — the preview keeps the focal
/// point pinned at its (x, y) position on screen and zooms around it, so the two only agree
/// when x = y = 0.5. An explicit crop window sidesteps that mismatch entirely rather than
/// trying to coax gravity:fp into it. imgproxy's `zoom` processing option would otherwise be
/// the more direct fit, but it's Pro-only: verified empirically against the OSS image
/// (ghcr.io/imgproxy/imgproxy) that a `zoom:` option is parsed without error yet silently has
/// no effect (the source passes through unresized). Since arbitrary processing options are now
/// accepted (IMGPROXY_ONLY_PRESETS=false — see imgproxy/Dockerfile), the preset must be
/// referenced via the "pr:" processing option rather than a bare name; the signing key/salt
/// HMAC, not the preset allowlist, is what keeps a leaked URL from being tampered with.
/// Extracted as a pure function so it's testable without a running imgproxy instance.
/// </summary>
public static class ImgproxyUrlBuilder
{
    public static string Build(
        string bucketName, string key, ImagePlacement placement, ImgproxyOptions options,
        ImageCrop? crop = null, ImageDimensions? sourceDimensions = null)
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
            if (sourceDimensions is null)
                throw new ArgumentNullException(nameof(sourceDimensions), "sourceDimensions is required whenever crop is set — the crop window depends on the source image's aspect ratio.");

            processingOptions += BuildCropWindow(crop, AspectRatioFor(placement), sourceDimensions);
        }
        var path = $"/{processingOptions}/{encodedSource}";
        var signature = Sign(path, options.Key, options.Salt);

        return $"{options.BaseUrl.TrimEnd('/')}/{signature}{path}";
    }

    // Reproduces PhotoCropStep.tsx's preview exactly: an <img> with object-fit:cover,
    // object-position:x%,y% and transform:scale(s) around transform-origin x%,y%. CSS resolves
    // that to a window of the source that's visible in the box — worked out below algebraically
    // (px = fraction of source width/height, box aspect R = targetW/targetH, source aspect
    // A = sourceW/sourceH):
    //   - "cover" first scales the source by c0 = max(R/A, 1) along whichever axis is tight, so
    //     only one axis ever has slack to crop; object-position places the focal point (x, y) of
    //     the source at box position (x, y) (this is also exactly what a bare gravity:fp does at
    //     scale 1, which is why this used to be a separate, gravity:fp-only branch).
    //   - transform-origin lands on that same screen point (box position (x, y) again, since
    //     it's a % of the img's own border box, not of the source pixels) — so the added zoom
    //     doesn't shift the focal point on screen at all, it scales everything else around it.
    // Composing both gives one window per axis, sized 1/(s·max(R/A,1)) on the axis "cover"
    // didn't already crop and 1/(s·max(A/R,1)) on the one it did, positioned so the focal point
    // sits at the *same relative offset within the window* that it sits at in the full source —
    // left = x·(1 − width), top = y·(1 − height) — which is the fixed point of "zoom around a
    // point that doesn't move on screen". Both window edges stay within [0, 1] for any x, y in
    // [0, 1] and s ≥ 1, so — unlike gravity:fp — this never needs edge-clamping.
    private static string BuildCropWindow(ImageCrop crop, decimal targetAspectRatio, ImageDimensions sourceDimensions)
    {
        var sourceAspectRatio = (decimal)sourceDimensions.Width / sourceDimensions.Height;
        var (width, height) = sourceAspectRatio >= targetAspectRatio
            ? (targetAspectRatio / sourceAspectRatio / crop.Scale, 1m / crop.Scale)
            : (1m / crop.Scale, sourceAspectRatio / targetAspectRatio / crop.Scale);
        var left = crop.X * (1 - width);
        var top = crop.Y * (1 - height);

        // imgproxy's crop treats a width/height >= 1 as an *absolute pixel* count rather than a
        // relative fraction (verified empirically: crop:1:1 produced a 1x1 image) — width/height
        // only reach exactly 1 here when there's nothing to crop on that axis (scale 1 and it's
        // the axis "cover" wasn't already trimming), where imgproxy's own "0 means full
        // width/height" is the correct spelling of the same no-op.
        // "nowe" (north-west) with an offset anchors the crop at an explicit top-left corner —
        // unlike every other gravity (including fp), which can only center the crop, never place
        // it at an arbitrary position within the output. Declared after the preset reference so
        // it overrides the preset's own gravity:sm (imgproxy applies same-named processing
        // options in order, last one wins); the crop window's aspect ratio always matches the
        // preset's target exactly, so that final gravity is a no-op wherever it lands.
        return $"/crop:{FormatCropFraction(width)}:{FormatCropFraction(height)}:nowe:{FormatOption(left)}:{FormatOption(top)}/gravity:ce";
    }

    private static string FormatCropFraction(decimal value) => value >= 1m ? "0" : FormatOption(value);

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

    // Target width/height ratio for every crop-backed placement — must match both the preset's
    // own width/height (imgproxy/presets.conf) and the aspectRatio the matching picker passes
    // into PhotoCropStep (CoverPhotoPickerModal's COVER_ASPECT_RATIO, PersonaAvatarPickerModal's
    // implicit 1:1 circle), since BuildCropWindow's math assumes the crop window it hands
    // imgproxy already has this exact aspect ratio.
    private static decimal AspectRatioFor(ImagePlacement placement) => placement switch
    {
        ImagePlacement.PersonaAvatar => 1m,
        ImagePlacement.ChapterCover or ImagePlacement.ChapterCoverFeatured or ImagePlacement.BaulCover => 8m / 5m,
        _ => throw new ArgumentOutOfRangeException(nameof(placement), placement, "This placement isn't crop-backed — it should never receive a non-null ImageCrop.")
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
