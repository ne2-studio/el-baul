using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Recuerdos.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.Tests;

// Pins the PhotoDate -> SubjectDate collapse rule shared by RecuerdoListReadModel (EF) and
// InMemoryRecuerdoListReadModel (Lite) — both funnel through RecuerdoListRowFactory.Build, so a
// single test here covers both implementations. Mirrors PhotoOrdering.OrderByChronology()'s
// Year/Month??1/Day??1 collapse of a partial PhotoDate into a comparable value.
public class RecuerdoListRowFactoryTests
{
    private static readonly BaulId BaulId = new(Guid.NewGuid());
    private static readonly UserId UserId = new("user-1");
    private static readonly DateTime CreatedAt = new(2020, 1, 1);

    private static Recuerdo PhotoScopedRecuerdo(PhotoId photoId) =>
        new(new RecuerdoId(Guid.NewGuid()), photoId, null, BaulId, UserId, "Un recuerdo", CreatedAt);

    private static Photo PhotoWithDate(PhotoId id, PhotoDate? date) =>
        PhotoMother.Create(id, null, BaulId, "key", date, UserId, CreatedAt);

    [Fact]
    public void Build_ShouldSetSubjectDate_ToFullyDatedPhotosDate()
    {
        var photoId = new PhotoId(Guid.NewGuid());
        var recuerdo = PhotoScopedRecuerdo(photoId);
        var photo = PhotoWithDate(photoId, PhotoDate.Parse(2015, 6, 10).Value);

        var rows = RecuerdoListRowFactory.Build(
            [recuerdo], new Dictionary<PhotoId, Photo> { [photoId] = photo }, new Dictionary<ChapterId, string>());

        Assert.Equal(new DateTime(2015, 6, 10), rows.Single().SubjectDate);
    }

    [Fact]
    public void Build_ShouldDefaultMonthAndDay_ForPartiallyDatedPhotos()
    {
        var photoId = new PhotoId(Guid.NewGuid());
        var recuerdo = PhotoScopedRecuerdo(photoId);
        var photo = PhotoWithDate(photoId, PhotoDate.Parse(2015, null, null).Value);

        var rows = RecuerdoListRowFactory.Build(
            [recuerdo], new Dictionary<PhotoId, Photo> { [photoId] = photo }, new Dictionary<ChapterId, string>());

        Assert.Equal(new DateTime(2015, 1, 1), rows.Single().SubjectDate);
    }

    [Fact]
    public void Build_ShouldLeaveSubjectDateNull_ForUndatedPhotos()
    {
        var photoId = new PhotoId(Guid.NewGuid());
        var recuerdo = PhotoScopedRecuerdo(photoId);
        var photo = PhotoWithDate(photoId, null);

        var rows = RecuerdoListRowFactory.Build(
            [recuerdo], new Dictionary<PhotoId, Photo> { [photoId] = photo }, new Dictionary<ChapterId, string>());

        Assert.Null(rows.Single().SubjectDate);
    }

    [Fact]
    public void Build_ShouldLeaveSubjectDateNull_ForChapterScopedRecuerdos()
    {
        var chapterId = new ChapterId(Guid.NewGuid());
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, chapterId, BaulId, UserId, "Un recuerdo", CreatedAt);

        var rows = RecuerdoListRowFactory.Build(
            [recuerdo], new Dictionary<PhotoId, Photo>(), new Dictionary<ChapterId, string> { [chapterId] = "Chapter" });

        Assert.Null(rows.Single().SubjectDate);
    }
}
