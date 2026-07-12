namespace ElBaul.Ports.Input;

public record BaulPreviewDto
(
    string Id,
    string Name,
    string? Description,
    IReadOnlyList<string> PreviewPhotos
);
