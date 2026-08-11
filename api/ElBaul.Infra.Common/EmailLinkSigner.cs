using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using ElBaul.OutputPorts.Notifications;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

/// <summary>
/// Signs the destination URL (and click-recording context) directly into the token, HMAC-style —
/// same primitive el-baul-api already uses for imgproxy URLs. A "v1." prefix distinguishes these
/// self-contained tokens from the plain Guid.NewGuid() tokens minted before this scheme existed
/// (those never contain a dot), so EmailTrackingController can keep resolving already-delivered
/// emails via the old DB-lookup path without a migration or a dual-write period. Shared between
/// el-baul-api and el-baul-api-lite (no Postgres/EF dependency), same as GuidIdGenerator/SystemClock.
/// </summary>
public class EmailLinkSigner(IConfiguration configuration) : IEmailLinkSigner
{
    private const string Prefix = "v1.";
    private readonly byte[] _key = Convert.FromHexString(configuration["EmailLinkSigning:Key"] ?? "");

    public string CreateToken(Guid sentEmailId, string linkKey, string destinationUrl)
    {
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(new TokenPayload(sentEmailId, linkKey, destinationUrl));
        var signatureBytes = Sign(payloadBytes);
        return $"{Prefix}{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
    }

    public EmailLinkTokenPayload? TryDecode(string token)
    {
        if (!token.StartsWith(Prefix, StringComparison.Ordinal)) return null;

        var rest = token.AsSpan(Prefix.Length);
        var separatorIndex = rest.IndexOf('.');
        if (separatorIndex < 0) return null;

        byte[] payloadBytes, signatureBytes;
        try
        {
            payloadBytes = Base64UrlDecode(rest[..separatorIndex].ToString());
            signatureBytes = Base64UrlDecode(rest[(separatorIndex + 1)..].ToString());
        }
        catch (FormatException)
        {
            return null;
        }

        var expectedSignature = Sign(payloadBytes);
        if (signatureBytes.Length != expectedSignature.Length) return null;
        if (!CryptographicOperations.FixedTimeEquals(signatureBytes, expectedSignature)) return null;

        try
        {
            var payload = JsonSerializer.Deserialize<TokenPayload>(payloadBytes);
            return payload is null ? null : new EmailLinkTokenPayload(payload.SentEmailId, payload.LinkKey, payload.DestinationUrl);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private byte[] Sign(byte[] payloadBytes)
    {
        using var hmac = new HMACSHA256(_key);
        return hmac.ComputeHash(payloadBytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        var padding = (4 - padded.Length % 4) % 4;
        if (padding == 3) throw new FormatException("Invalid base64url length.");

        return Convert.FromBase64String(padded + new string('=', padding));
    }

    private record TokenPayload(
        [property: JsonPropertyName("e")] Guid SentEmailId,
        [property: JsonPropertyName("k")] string LinkKey,
        [property: JsonPropertyName("u")] string DestinationUrl);
}
