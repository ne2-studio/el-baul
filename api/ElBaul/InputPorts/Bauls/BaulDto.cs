namespace ElBaul.InputPorts.Bauls;
public record BaulDto
(
    string Id,
    string Name,
    string? Description,
    int ChapterCount,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsCustodio,
    string Role,
    int MemberCount
);
