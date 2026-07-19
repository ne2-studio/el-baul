using System.Security.Cryptography;
using System.Text;
using ElBaul.Ports.Output;

namespace ElBaul.Infra;

/// <summary>
/// Builds signed imgproxy URLs pointing at photos stored in MinIO, via imgproxy's native
/// S3 source support (s3://bucket/key) — imgproxy holds its own S3 credentials and reads
/// MinIO directly over the internal docker network, so this process never generates or
/// exposes a MinIO URL of any kind. Resize/crop behavior is a named preset configured
/// server-side on imgproxy (see imgproxy/presets.conf), keyed by ImagePlacement, so a
/// leaked signing key can't be used to request an arbitrary render size. Extracted as a
/// pure function so it's testable without a running imgproxy instance.
/// </summary>
public static class ImgproxyUrlBuilder
{
    public static string Build(string bucketName, string key, ImagePlacement placement, ImgproxyOptions options)
    {
        // imgproxy's S3 source resolver reads the key portion literally (no URL
        // percent-decoding), so the storage key — which can contain spaces/accents
        // from the original upload's file name — is embedded as-is, not escaped.
        // Verified empirically against a running imgproxy: a percent-encoded key
        // results in a literal (and therefore wrong, 404) S3 lookup.
        var source = $"s3://{bucketName}/{key}";
        var encodedSource = Base64UrlEncode(Encoding.UTF8.GetBytes(source));
        // With IMGPROXY_ONLY_PRESETS enabled, the options segment is a bare
        // colon-delimited preset list — no "pr:" prefix (that's only valid when
        // arbitrary processing options are also allowed).
        var path = $"/{PresetFor(placement)}/{encodedSource}";
        var signature = Sign(path, options.Key, options.Salt);

        return $"{options.BaseUrl.TrimEnd('/')}/{signature}{path}";
    }

    private static string PresetFor(ImagePlacement placement) => placement switch
    {
        ImagePlacement.PhotoGridThumbnail => "photo-grid-thumbnail",
        ImagePlacement.PhotoFull => "photo-full",
        ImagePlacement.AlbumCover => "album-cover",
        ImagePlacement.AlbumCoverFeatured => "album-cover-featured",
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
