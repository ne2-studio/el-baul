using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

// Test-only convenience over PhotoDate.TryCreate, for building known-valid dates inline in
// test fixtures without an out-var dance at every call site.
public static class PhotoDates
{
    public static PhotoDate Of(int year, int? month = null, int? day = null)
    {
        if (!PhotoDate.TryCreate(year, month, day, out var date, out var error))
            throw new ArgumentException(error);
        return date;
    }
}
