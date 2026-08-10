using System.ComponentModel;
using System.Globalization;
using ElBaul.Ports.Output;

namespace ElBaul.Api;

/// <summary>Lets ASP.NET Core's SimpleTypeModelBinder bind a route/query/form string straight to
/// an IParsableId&lt;T&gt; id — e.g. `{photoId:guid}` binds to a PhotoId parameter directly,
/// the same way it already binds a route Guid, through the exact same Parse rule every manual
/// Result&lt;T&gt;-returning caller already used. Registered per id type via
/// TypeDescriptor.AddAttributes in ElBaulApiHost, not a [TypeConverter] attribute on the struct
/// itself, so Ports/Output stays free of anything HTTP/model-binding-specific.</summary>
internal sealed class IdTypeConverter<TId> : TypeConverter where TId : struct, IParsableId<TId>
{
    public override bool CanConvertFrom(ITypeDescriptorContext? context, Type sourceType) =>
        sourceType == typeof(string) || base.CanConvertFrom(context, sourceType);

    public override object ConvertFrom(ITypeDescriptorContext? context, CultureInfo? culture, object value)
    {
        if (value is not string raw) return base.ConvertFrom(context, culture, value)!;

        var result = TId.Parse(raw);
        if (result.IsFailure) throw new FormatException(result.Error.Message);
        return result.Value;
    }
}
