using ElBaul.Application.Photos;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

// PhotoOrdering has two hand-written overloads (IQueryable for EF, IEnumerable for the
// in-memory call sites) that must agree on ordering. PhotoRepository, InMemoryPhotoRepository
// and PhotoManager.GetByPersonaIdAsync all call one of these two overloads directly, so pinning
// the overloads to each other here is what guarantees the three call sites can't silently
// diverge — see PhotoManagerTests.GetPageAsync_ShouldReturnBaulWidePhotos_InChronologicalOrder_WithUndatedLast
// and .GetByPersonaIdAsync_ShouldReturnTaggedPhotos_OrderedChronologically for the black-box
// behavior this protects.
public class PhotoOrderingTests
{
    private static Photo MakePhoto(string id, PhotoDate? date, DateTime createdAt) =>
        Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), id, date, "uploader", createdAt);

    [Fact]
    public void OrderByChronology_QueryableAndEnumerableOverloads_AgreeOnOrder()
    {
        var baseTime = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var photos = new[]
        {
            MakePhoto("undated-earlier-created", null, baseTime),
            MakePhoto("undated-later-created", null, baseTime.AddDays(1)),
            MakePhoto("year-only-2020", PhotoDates.Of(2020), baseTime),
            MakePhoto("year-month-2020-06", PhotoDates.Of(2020, 6), baseTime),
            MakePhoto("full-date-2020-06-15", PhotoDates.Of(2020, 6, 15), baseTime),
            MakePhoto("older-1998", PhotoDates.Of(1998, 6, 15), baseTime),
            MakePhoto("same-date-earlier-created", PhotoDates.Of(2020, 6, 15), baseTime.AddDays(-1)),
            MakePhoto("same-date-later-created", PhotoDates.Of(2020, 6, 15), baseTime.AddDays(1)),
        };

        var viaEnumerable = photos.AsEnumerable().OrderByChronology().Select(p => p.StorageKey).ToList();
        var viaQueryable = photos.AsQueryable().OrderByChronology().Select(p => p.StorageKey).ToList();

        Assert.Equal(viaEnumerable, viaQueryable);
        Assert.Equal(
        [
            "older-1998",
            "year-only-2020",
            "year-month-2020-06",
            "same-date-earlier-created",
            "full-date-2020-06-15",
            "same-date-later-created",
            "undated-earlier-created",
            "undated-later-created",
        ], viaEnumerable);
    }
}
