using ElBaul.Ports.Output;

namespace ElBaul.Tests;

// This validation used to be exercised indirectly through PhotoManager.UploadAsync/ChangeDateAsync,
// back when those methods took raw (year, month, day) and validated on entry. Now that
// IPhotoManager's input ports take an already-validated PhotoDate, invalid components can no
// longer reach the manager at all — so the validation itself is tested here, at the VO.
public class PhotoDateTests
{
    [Fact]
    public void TryCreate_ShouldReject_YearOutOfRange()
    {
        var success = PhotoDate.TryCreate(1500, null, null, out _, out var error);

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public void TryCreate_ShouldReject_DayGivenWithoutMonth()
    {
        var success = PhotoDate.TryCreate(2020, null, 15, out _, out var error);

        Assert.False(success);
        Assert.NotNull(error);
    }

    [Fact]
    public void TryCreate_ShouldAccept_YearOnly()
    {
        var success = PhotoDate.TryCreate(2020, null, null, out var date, out _);

        Assert.True(success);
        Assert.Equal(2020, date.Year);
        Assert.Null(date.Month);
        Assert.Null(date.Day);
    }

    [Fact]
    public void TryCreate_ShouldAccept_FullDate()
    {
        var success = PhotoDate.TryCreate(2020, 6, 15, out var date, out _);

        Assert.True(success);
        Assert.Equal(2020, date.Year);
        Assert.Equal(6, date.Month);
        Assert.Equal(15, date.Day);
    }
}
