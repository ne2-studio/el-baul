using ElBaul.Core.Personas.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra;

public class HttpProfilePictureFetcher(HttpClient httpClient, ILogger<HttpProfilePictureFetcher> logger) : IProfilePictureFetcher
{
    private const long MaxBytes = 5_000_000;

    public async Task<byte[]?> TryFetchAsync(string url)
    {
        try
        {
            using var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Profile picture fetch returned {StatusCode} for {Url}", response.StatusCode, url);
                return null;
            }

            if (response.Content.Headers.ContentLength is { } length && length > MaxBytes)
            {
                logger.LogWarning("Profile picture at {Url} exceeds max size ({Length} bytes)", url, length);
                return null;
            }

            return await response.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Failed to fetch profile picture from {Url}", url);
            return null;
        }
    }
}
