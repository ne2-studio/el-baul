using ElBaul.Core.Bauls;
using ElBaul.Core.Chapters;
using ElBaul.Core.Feed;
using ElBaul.Core.Moderation;
using ElBaul.Core.Personas;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;

namespace ElBaul.Api.Models;

// One response per screen-shaped read, not per domain concept — see Scope/*Aggregator.cs for
// why these live outside ElBaul.Core. RemovalRequests is null (not an empty list) when the
// current user isn't an admin, mirroring the frontend's own canReviewRemovalRequests gate rather
// than surfacing that as a 403 for a section the screen never asked to show. BaulFeed is null
// both when the caller didn't ask for it (includeBaulFeed=false) and when Features:BaulFeedEnabled
// is off — the caller can't tell those apart from this shape alone, same as it couldn't before.
public record BaulScopeDto(
    BaulDto Baul,
    IEnumerable<ChapterDto> Chapters,
    IEnumerable<PhotoDto> LoosePhotos,
    IEnumerable<RecuerdoDto> Recuerdos,
    IEnumerable<PersonaDto> Personas,
    IEnumerable<RemovalRequestDto>? RemovalRequests,
    FeedPageDto? BaulFeed);

public record ChapterScopeDto(
    IEnumerable<PhotoDto> Photos,
    IEnumerable<RecuerdoDto> Recuerdos);

public record PersonaScopeDto(
    IEnumerable<PersonaDto> Personas,
    IEnumerable<PhotoDto> PersonaPhotos,
    IEnumerable<RecuerdoDto> BaulRecuerdos);
