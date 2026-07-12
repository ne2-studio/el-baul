namespace ElBaul.Infra;

/// <summary>
/// Rewrites a presigned URL's scheme+host+port from the internal Docker-network
/// endpoint MinIO was called through to the public endpoint a browser can reach,
/// leaving the path and query string (including the AWS signature) untouched.
/// Extracted as a pure function so it's testable without mocking the S3 SDK.
/// </summary>
public static class SignedUrlRewriter
{
    public static string Rewrite(string url, string publicEndpoint)
    {
        var publicUri = new Uri(publicEndpoint);
        var builder = new UriBuilder(url)
        {
            Scheme = publicUri.Scheme,
            Host = publicUri.Host,
            Port = publicUri.Port
        };

        return builder.Uri.ToString();
    }
}
