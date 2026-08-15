namespace ElBaul.Core.Bauls.InputPorts;
public record BaulDto
(
    string Id,
    string Name,
    string? Description,
    int ChapterCount,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string Role,
    bool IsCustodio,
    int MemberCount,
    decimal CoverCropX,
    decimal CoverCropY,
    decimal CoverCropScale
);
