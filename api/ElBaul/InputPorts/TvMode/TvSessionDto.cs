namespace ElBaul.InputPorts.TvMode;

public record CreateTvSessionResult(string Url, string Token, DateTime ExpiresAt);

// One photo as shown on the TV screen — already flattened (chapter name, tagged persona
// nicknames, latest recuerdo as the "quote") so the anonymous TV client never needs to make a
// second authenticated-shaped call per photo. See TvSessionManager.GetContentAsync.
public record TvPhotoDto(
    string Id,
    string ImageUrl,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string? ChapterName,
    IReadOnlyList<string> PersonaNames,
    string? Quote,
    string? QuoteAuthor
);

public record TvSessionContentDto(string BaulName, IReadOnlyList<TvPhotoDto> Photos);
