using ElBaul.OutputPorts.Photos;
using ElBaul.Shared;
namespace ElBaul.Tests.Fakes;

// Test-only convenience over PhotoDate.Parse, for building known-valid dates inline in
// test fixtures without unwrapping a Result at every call site.
public static class PhotoDates
{
    public static PhotoDate Of(int year, int? month = null, int? day = null)
    {
        var result = PhotoDate.Parse(year, month, day);
        if (result.IsFailure) throw new ArgumentException(result.Error.Message);
        return result.Value;
    }
}
