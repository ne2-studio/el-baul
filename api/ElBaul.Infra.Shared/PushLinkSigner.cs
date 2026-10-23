using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using ElBaul.Core.Notifications.OutputPorts;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

/// <summary>
/// Same HMAC-signed-token primitive as EmailLinkSigner, kept as its own small class rather than
/// folding push into EmailLinkSigner: the two token families protect unrelated aggregates
/// (SentEmail vs SentPushNotification) and a "po1." prefix is all that's needed to keep them
/// from ever cross-decoding, so there's no shared logic worth factoring out beyond the ~30 lines
/// duplicated here. Shared between el-baul-api and el-baul-api-lite (no Postgres/EF dependency),
/// same as EmailLinkSigner/GuidIdGenerator/SystemClock. Reuses the same signing key as
/// EmailLinkSigning:Key — one HMAC secret for every outbound-notification tracking token.
/// </summary>
public class PushLinkSigner(IConfiguration configuration) : IPushLinkSigner
{
    private const string OpenPrefix = "po1.";
    private readonly byte[] _key = Convert.FromHexString(configuration["EmailLinkSigning:Key"] ?? "");

    public string CreateOpenToken(Guid sentPushNotificationId)
    {
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(new OpenTokenPayload(sentPushNotificationId));
        var signatureBytes = Sign(payloadBytes);
        return $"{OpenPrefix}{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
    }

    public Guid? TryDecodeOpenToken(string token)
    {
        if (!TryUnwrap(token, out var payloadBytes)) return null;

        try
        {
            var payload = JsonSerializer.Deserialize<OpenTokenPayload>(payloadBytes);
            return payload?.SentPushNotificationId;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private bool TryUnwrap(string token, out byte[] payloadBytes)
    {
        payloadBytes = [];
        if (!token.StartsWith(OpenPrefix, StringComparison.Ordinal)) return false;

        var rest = token.AsSpan(OpenPrefix.Length);
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

    private record OpenTokenPayload([property: JsonPropertyName("p")] Guid SentPushNotificationId);
}
