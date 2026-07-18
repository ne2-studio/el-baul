using ElBaul.Ports.Output;
using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra;

public class ExifPhotoDateExtractor(ILogger<ExifPhotoDateExtractor> logger) : IPhotoDateExtractor
{
    public (int Year, int Month, int Day)? TryExtractDate(Stream content)
    {
        try
        {
            var directories = ImageMetadataReader.ReadMetadata(content);
            var exifSubIfd = directories.OfType<ExifSubIfdDirectory>().FirstOrDefault();
            if (exifSubIfd is null) return null;

            if (exifSubIfd.TryGetDateTime(ExifDirectoryBase.TagDateTimeOriginal, out var date)
                || exifSubIfd.TryGetDateTime(ExifDirectoryBase.TagDateTimeDigitized, out date))
            {
                return (date.Year, date.Month, date.Day);
            }

            return null;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Could not read EXIF date from uploaded photo, leaving it undated");
            return null;
        }
    }
}
