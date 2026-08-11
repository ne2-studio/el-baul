using System.Diagnostics;
using ElBaul.OutputPorts.Photos;
using ElBaul.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.PhotoStorage;

// iPhones shoot HEIC/HEIF by default, which most browsers can't decode inline. Re-encoding to
// JPEG at upload time means every stored photo is directly displayable regardless of source
// device, and takes imgproxy's HEIC-as-a-source-format support out of the equation entirely.
// Shells out to Alpine's native `magick` CLI (apk `imagemagick`/`imagemagick-heic`, see
// api/Dockerfile) rather than a .NET binding, since Magick.NET doesn't reliably support musl.
public class HeicToJpegPhotoImageNormalizer(ILogger<HeicToJpegPhotoImageNormalizer> logger) : IPhotoImageNormalizer
{
    private static readonly HashSet<string> HeicContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"
    };

    private static readonly string[] HeicExtensions = [".heic", ".heif"];

    public async Task<NormalizedPhoto> NormalizeAsync(Stream content, string contentType, string fileName)
    {
        if (!IsHeic(contentType, fileName)) return new NormalizedPhoto(content, contentType, fileName);

        try
        {
            content.Position = 0;
            var jpegBytes = await ConvertToJpegAsync(content);
            return new NormalizedPhoto(new MemoryStream(jpegBytes), "image/jpeg", Path.ChangeExtension(fileName, ".jpg"));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to convert HEIC photo {FileName} to JPEG, storing original bytes", fileName);
            content.Position = 0;
            return new NormalizedPhoto(content, contentType, fileName);
        }
    }

    private static bool IsHeic(string contentType, string fileName) =>
        HeicContentTypes.Contains(contentType) ||
        HeicExtensions.Contains(Path.GetExtension(fileName), StringComparer.OrdinalIgnoreCase);

    private static async Task<byte[]> ConvertToJpegAsync(Stream content)
    {
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "magick",
                // Read HEIC from stdin, bake EXIF orientation into pixels (browsers/imgproxy
                // shouldn't need to special-case it), write JPEG to stdout.
                ArgumentList = { "heic:-", "-auto-orient", "-quality", "90", "jpg:-" },
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            }
        };

        process.Start();

        var stdinTask = WriteStdinAsync(content, process.StandardInput.BaseStream);
        var stdoutTask = ReadAllBytesAsync(process.StandardOutput.BaseStream);
        var stderrTask = process.StandardError.ReadToEndAsync();

        await Task.WhenAll(stdinTask, stdoutTask, stderrTask);
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
            throw new InvalidOperationException($"magick exited with code {process.ExitCode}: {stderrTask.Result}");

        return stdoutTask.Result;
    }

    private static async Task WriteStdinAsync(Stream content, Stream stdin)
    {
        await content.CopyToAsync(stdin);
        await stdin.FlushAsync();
        stdin.Close();
    }

    private static async Task<byte[]> ReadAllBytesAsync(Stream stream)
    {
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer);
        return buffer.ToArray();
    }
}
