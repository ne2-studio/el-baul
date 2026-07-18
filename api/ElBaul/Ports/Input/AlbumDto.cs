namespace ElBaul.Ports.Input;

public record AlbumDto
(
    string Id,
    string BaulId,
    string Name,
    string? Description,
    int PhotoCount,
    string? CoverPhotoUrl,
    string? FeaturedCoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int RecuerdoCount,
    string? LatestRecuerdoText,
    string? LatestRecuerdoAuthor,
    int? MinDateYear,
    int? MinDateMonth,
    int? MinDateDay,
    int? MaxDateYear,
    int? MaxDateMonth,
    int? MaxDateDay,
    int UndatedPhotoCount
);
