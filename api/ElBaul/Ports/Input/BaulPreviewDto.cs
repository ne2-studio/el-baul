namespace ElBaul.Ports.Input;

public record BaulPreviewDto
(
    string Id,
    string Name,
    string? Description,
    string PersonaNickname,
    IReadOnlyList<string> PreviewPhotos
);
