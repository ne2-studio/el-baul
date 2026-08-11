using Ne2Studio.Common;
namespace ElBaul.Domain;
// A photo's capture date, which is often only partially known (year alone, or year+month) —
// Month/Day are independently optional, but Year is always present once there's a date at all
// (a photo with no date at all is a null PhotoDate, not a PhotoDate with everything null).
// Parse is the single place the "day requires a month" invariant and the valid ranges are
// checked, replacing the copy of that logic that used to live in PhotoManager.ValidateDate — the
// same Result<T>-returning shape as AvatarCrop.Create and the Ids.Parse family, so every value
// object at the HTTP boundary is validated the same way.
//
// A reference-type record, not a struct: Photo.Date needs to be optional, and EF Core's
// ComplexProperty mapping only supports optional (nullable) complex properties for reference
// types — a Nullable<T>-wrapped struct trips the `notnull` constraint on ComplexProperty's
// generic type parameter.
public record PhotoDate
{
    public int Year { get; }
    public int? Month { get; }
    public int? Day { get; }

    private PhotoDate(int year, int? month, int? day)
    {
        Year = year;
        Month = month;
        Day = day;
    }

    public static Result<PhotoDate> Parse(int year, int? month, int? day)
    {
        var error = Validate(year, month, day);
        return error is null
            ? Result.Success(new PhotoDate(year, month, day))
            : Result.Failure<PhotoDate>(ApplicationError.Validation(error));
    }

    private static string? Validate(int year, int? month, int? day)
    {
        if (year < 1800 || year > DateTime.UtcNow.Year + 1) return "Year is out of range";
        if (month is < 1 or > 12) return "Month is out of range";
        if (day is not null && month is null) return "Day requires a month";
        if (day is < 1 or > 31) return "Day is out of range";
        return null;
    }
}
