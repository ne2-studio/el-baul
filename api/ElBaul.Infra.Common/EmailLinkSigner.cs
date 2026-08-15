using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using ElBaul.Core.Notifications.OutputPorts;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

/// <summary>
/// Signs the destination URL (and click-recording context) directly into the token, HMAC-style —
/// same primitive el-baul-api already uses for imgproxy URLs. A "v1." prefix distinguishes these
/// self-contained tokens from the plain Guid.NewGuid() tokens minted before this scheme existed
/// (those never contain a dot), so EmailTrackingController can keep resolving already-delivered
/// emails via the old DB-lookup path without a migration or a dual-write period. Shared between
/// el-baul-api and el-baul-api-lite (no Postgres/EF dependency), same as GuidIdGenerator/SystemClock.
/// Open-pixel tokens (CreateOpenToken/TryDecodeOpenToken) reuse the same key and HMAC/base64url
/// machinery under an "o1." prefix instead — a distinct prefix so a click token can never decode
/// as an open token or vice versa, even though both are signed with the same key.
/// </summary>
public class EmailLinkSigner(IConfiguration configuration) : IEmailLinkSigner
{
    private const string Prefix = "v1.";
    private const string OpenPrefix = "o1.";
    private readonly byte[] _key = Convert.FromHexString(configuration["EmailLinkSigning:Key"] ?? "");

    public string CreateToken(Guid sentEmailId, string linkKey, string destinationUrl)
    {
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(new TokenPayload(sentEmailId, linkKey, destinationUrl));
        var signatureBytes = Sign(payloadBytes);
        return $"{Prefix}{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
    }

    public EmailLinkTokenPayload? TryDecode(string token)
    {
        if (!TryUnwrap(token, Prefix, out var payloadBytes)) return null;

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

    public string CreateOpenToken(Guid sentEmailId)
    {
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(new OpenTokenPayload(sentEmailId));
        var signatureBytes = Sign(payloadBytes);
        return $"{OpenPrefix}{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
    }

    public Guid? TryDecodeOpenToken(string token)
    {
        if (!TryUnwrap(token, OpenPrefix, out var payloadBytes)) return null;

        try
        {
            var payload = JsonSerializer.Deserialize<OpenTokenPayload>(payloadBytes);
            return payload?.SentEmailId;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private bool TryUnwrap(string token, string prefix, out byte[] payloadBytes)
    {
        payloadBytes = [];
        if (!token.StartsWith(prefix, StringComparison.Ordinal)) return false;

        var rest = token.AsSpan(prefix.Length);
        var separatorIndex = rest.IndexOf('.');
        if (separatorIndex < 0) return false;

        byte[] signatureBytes;
        try
        {
            payloadBytes = Base64UrlDecode(rest[..separatorIndex].ToString());
            signatureBytes = Base64UrlDecode(rest[(separatorIndex + 1)..].ToString());
        }
        catch (FormatException)
        {
            return false;
        }

        var expectedSignature = Sign(payloadBytes);
        if (signatureBytes.Length != expectedSignature.Length) return false;
        return CryptographicOperations.FixedTimeEquals(signatureBytes, expectedSignature);
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

    private record OpenTokenPayload([property: JsonPropertyName("e")] Guid SentEmailId);
}
