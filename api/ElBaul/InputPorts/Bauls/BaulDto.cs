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
    string Role,
    int MemberCount
);
