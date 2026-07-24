namespace ElBaul.Ports.Input;

public record ChapterDto
(
    string Id,
    string BaulId,
    string Name,
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
