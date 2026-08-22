using Ne2Studio.Common;
namespace ElBaul.Domain;
/// <summary>
/// A user-chosen focal point (X/Y, fraction of the source image) plus zoom (Scale) — how a
/// persona's avatar or a chapter/baúl's cover photo should be framed when resampled by imgproxy
/// (see Photos.OutputPorts.IPhotoStorage and ImgproxyUrlBuilder, which turn this into gravity:fp
/// + crop processing options). Lives in the cross-cutting Domain namespace, not under a single
/// feature, because it's consumed on both sides of a port — Personas/Bauls/Chapters InputPorts
/// take it as a parameter, Photos' IPhotoStorage OutputPort renders it — and ArchitectureTests
/// only allows ElBaul.Domain types to appear on both sides. Create is the single place the valid
/// ranges are checked, the same Result&lt;T&gt;-returning shape as PhotoDate.Parse and the
/// Ids.Parse family.
/// </summary>
public record ImageCrop(decimal X, decimal Y, decimal Scale)
{
    public static ImageCrop DefaultCoverCrop { get; } = new(0.5m, 0.5m, 1m);

    public static Result<ImageCrop> Create(decimal x, decimal y, decimal scale)
    {
        if (x is < 0m or > 1m) return Result.Failure<ImageCrop>(ApplicationError.Validation("Photo crop x must be between 0 and 1"));
        if (y is < 0m or > 1m) return Result.Failure<ImageCrop>(ApplicationError.Validation("Photo crop y must be between 0 and 1"));
        if (scale is < 1m or > 3m) return Result.Failure<ImageCrop>(ApplicationError.Validation("Photo crop scale must be between 1 and 3"));
        return new ImageCrop(x, y, scale);
    }
}
