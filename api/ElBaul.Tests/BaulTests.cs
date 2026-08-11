using ElBaul.Domain;
using ElBaul.OutputPorts.Bauls;

namespace ElBaul.Tests;

public class BaulTests
{
    [Fact]
    public void WithChapterAdded_IncrementsChapterCountAndTouchesUpdatedAt()
    {
        var createdAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var previousUpdatedAt = createdAt.AddHours(1);
        var updatedAt = createdAt.AddHours(2);
        var baul = CreateBaul(chapterCount: 2, createdAt, previousUpdatedAt);

        var updated = baul.WithChapterAdded(updatedAt);

        Assert.Equal(3, updated.ChapterCount);
        Assert.Equal(updatedAt, updated.UpdatedAt);
        Assert.Equal(createdAt, updated.CreatedAt);
    }

    [Fact]
    public void WithChapterRemoved_DecrementsChapterCountAndTouchesUpdatedAt()
    {
        var createdAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var previousUpdatedAt = createdAt.AddHours(1);
        var updatedAt = createdAt.AddHours(2);
        var baul = CreateBaul(chapterCount: 2, createdAt, previousUpdatedAt);

        var updated = baul.WithChapterRemoved(updatedAt);

        Assert.Equal(1, updated.ChapterCount);
        Assert.Equal(updatedAt, updated.UpdatedAt);
        Assert.Equal(createdAt, updated.CreatedAt);
    }

    private static Baul CreateBaul(int chapterCount, DateTime createdAt, DateTime updatedAt) =>
        new(
            new BaulId(Guid.NewGuid()),
            "Familia",
            Description: null,
            new UserId("custodio-1"),
            chapterCount,
            createdAt,
            updatedAt);
}
