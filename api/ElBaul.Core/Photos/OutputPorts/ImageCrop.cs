namespace ElBaul.Core.Photos.OutputPorts;
/// <summary>
/// Focal-point crop/zoom for a stored image, applied server-side by imgproxy
/// (gravity:fp + zoom processing options) rather than client-side CSS — the browser
/// receives an already-cropped, properly resampled image instead of scaling a
/// full-resolution decode with `transform: scale()`.
/// </summary>
public record ImageCrop(decimal X, decimal Y, decimal Scale);
