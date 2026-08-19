using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ElBaul.Api.Swagger;

public sealed class RequireNonNullablePropertiesSchemaFilter : ISchemaFilter
{
    private static readonly NullabilityInfoContext NullabilityContext = new();

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Properties is null || schema.Properties.Count == 0) return;

        foreach (var property in context.Type.GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            if (!ShouldRequire(property)) continue;

            var schemaName = ToSchemaPropertyName(property);
            if (schema.Properties.ContainsKey(schemaName) && schema.Required is not null)
                schema.Required.Add(schemaName);
        }
    }

    private static bool ShouldRequire(PropertyInfo property)
    {
        var nullability = NullabilityContext.Create(property);
        return nullability.ReadState == NullabilityState.NotNull;
    }

    private static string ToSchemaPropertyName(PropertyInfo property)
    {
        var jsonPropertyName = property.GetCustomAttribute<JsonPropertyNameAttribute>();
        if (jsonPropertyName is not null) return jsonPropertyName.Name;

        return JsonNamingPolicy.CamelCase.ConvertName(property.Name);
    }
}
