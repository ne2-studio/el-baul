using ElBaul.Application.Photos;
using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Photos;
namespace ElBaul.Tests;

// This validation used to be exercised indirectly through PhotoManager.UploadAsync/ChangeDateAsync,
// back when those methods took raw (year, month, day) and validated on entry. Now that
// IPhotoManager's input ports take an already-validated PhotoDate, invalid components can no
// longer reach the manager at all — so the validation itself is tested here, at the VO.
public class PhotoDateTests
{
    [Fact]
    public void Parse_ShouldReject_YearOutOfRange()
    {
        var result = PhotoDate.Parse(1500, null, null);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public void Parse_ShouldReject_DayGivenWithoutMonth()
    {
        var result = PhotoDate.Parse(2020, null, 15);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public void Parse_ShouldAccept_YearOnly()
    {
        var result = PhotoDate.Parse(2020, null, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.Year);
        Assert.Null(result.Value.Month);
        Assert.Null(result.Value.Day);
    }

    [Fact]
    public void Parse_ShouldAccept_FullDate()
    {
        var result = PhotoDate.Parse(2020, 6, 15);

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.Year);
        Assert.Equal(6, result.Value.Month);
        Assert.Equal(15, result.Value.Day);
    }
}
