namespace ElBaul.Core.Photos;

// One baúl this PhotoAsset appears in, from the current user's point of view — only ever
// populated with baúles BaulAccessService says the caller may know about (see
// MyPhotosReadManager.GetMyPhotosAsync). Never leaks the id/name of a baúl the caller can't
// access, even when a Photo row for this asset exists there.
public record BaulAppearanceDto(string BaulId, string BaulName);

// The "Mis fotos" read model: one row per unique PhotoAsset the current user originally
// uploaded, deduplicated across every baúl it now appears in — see PhotoAssetDto's
// counterpart PhotoDto, which is per-(baúl, asset) instead. Intentionally carries no
// baúl/chapter id of its own: unlike PhotoDto, this projection is not scoped to one baúl.
public record PhotoAssetDto(
    string Id,
    string ThumbnailUrl,
    string FullUrl,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    int Width,
    int Height,
    DateTime CreatedAt,
    IReadOnlyList<BaulAppearanceDto> Baules
);

public record PhotoAssetPageDto(IReadOnlyList<PhotoAssetDto> Items, bool HasMore);
