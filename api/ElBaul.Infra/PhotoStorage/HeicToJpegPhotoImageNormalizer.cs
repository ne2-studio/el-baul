using System.Diagnostics;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.PhotoStorage;

// iPhones shoot HEIC/HEIF by default, which most browsers can't decode inline. Re-encoding to
// JPEG at upload time means every stored photo is directly displayable regardless of source
// device, and takes imgproxy's HEIC-as-a-source-format support out of the equation entirely.
// Shells out to Alpine's native `magick` CLI (apk `imagemagick`/`imagemagick-heic`, see
// api/Dockerfile) rather than a .NET binding, since Magick.NET doesn't reliably support musl.
public class HeicToJpegPhotoImageNormalizer(ILogger<HeicToJpegPhotoImageNormalizer> logger) : IPhotoImageNormalizer
{
    public async Task<NormalizedPhoto> NormalizeAsync(Stream content)
    {
        var bytes = await ReadAllBytesAsync(content);
        if (!HeicSniffer.IsHeic(bytes)) return new NormalizedPhoto(new MemoryStream(bytes));

        try
        {
            var jpegBytes = await ConvertToJpegAsync(new MemoryStream(bytes));
            return new NormalizedPhoto(new MemoryStream(jpegBytes));
        }
        catch (Exception ex)
        {
            // No client-declared content-type/filename to fall back to reporting here (this
            // port doesn't accept either, see IPhotoImageNormalizer) — the original bytes go on
            // to IImageProcessor.IdentifyAsync exactly as received, which rejects them as an
            // invalid image if it (like this conversion attempt) can't make sense of raw HEIC.
            logger.LogWarning(ex, "Failed to convert HEIC photo to JPEG, storing original bytes");
            return new NormalizedPhoto(new MemoryStream(bytes));
        }
    }

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
