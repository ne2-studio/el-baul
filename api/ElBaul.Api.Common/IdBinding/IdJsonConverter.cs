using System.Text.Json.Serialization;
using System.Text.Json;
using ElBaul.Domain;
namespace ElBaul.Api;

/// <summary>JSON (de)serializes an IParsableId&lt;T&gt; id straight to/from its wire string —
/// e.g. `"photoId": "3fa8..."` binds directly to a PhotoId, through the exact same Parse rule
/// every manual Result&lt;T&gt;-returning caller already used. An invalid string throws
/// JsonException, which System.Text.Json turns into model-binding failure ElBaulApiHost's
/// InvalidModelStateResponseFactory reshapes into the app's `{ "error": "..." }` body.</summary>
internal sealed class IdJsonConverter<TId> : JsonConverter<TId> where TId : struct, IParsableId<TId>
{
    public override TId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.GetString();
        var result = TId.Parse(raw);
        if (result.IsFailure) throw new JsonException(result.Error.Message);
        return result.Value;
    }

    public override void Write(Utf8JsonWriter writer, TId value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}

/// <summary>Auto-registers IdJsonConverter&lt;T&gt; for every IParsableId&lt;T&gt; struct System.Text.Json
/// encounters — a new id type in Ids.cs never needs a matching entry added here by hand.</summary>
internal sealed class IdJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsValueType && Array.Exists(typeToConvert.GetInterfaces(), IsParsableIdInterface);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(typeof(IdJsonConverter<>).MakeGenericType(typeToConvert))!;

    private static bool IsParsableIdInterface(Type i) =>
        i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IParsableId<>);
}
