using Ne2Studio.Common;
namespace ElBaul.Domain;
// A user-chosen focal point (X/Y, fraction of the source image) plus zoom (Scale) — how a
// persona's avatar or a chapter/baúl's cover photo should be framed when resampled by imgproxy
// (see OutputPorts.Photos.ImageCrop and ImgproxyUrlBuilder, which turn this into gravity:fp +
// crop processing options). Create is the single place the valid ranges are checked, the same
// Result<T>-returning shape as PhotoDate.Parse and the Ids.Parse family.
public record PhotoCrop(decimal X, decimal Y, decimal Scale)
{
    public static Result<PhotoCrop> Create(decimal x, decimal y, decimal scale)
    {
        if (x is < 0m or > 1m) return Result.Failure<PhotoCrop>(ApplicationError.Validation("Photo crop x must be between 0 and 1"));
        if (y is < 0m or > 1m) return Result.Failure<PhotoCrop>(ApplicationError.Validation("Photo crop y must be between 0 and 1"));
        if (scale is < 1m or > 3m) return Result.Failure<PhotoCrop>(ApplicationError.Validation("Photo crop scale must be between 1 and 3"));
        return new PhotoCrop(x, y, scale);
    }
}
