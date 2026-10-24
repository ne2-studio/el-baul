using ElBaul.Api.Swagger;
using ElBaul.Domain;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ElBaul.Api;

/// <summary>
/// The OpenAPI document of this API and, in Development only, its Swagger UI. The reviewed
/// contract is versioned separately under api/openapi/.
/// </summary>
public static class ElBaulApiSwaggerExtensions
{
    public static IServiceCollection AddElBaulApiSwaggerGen(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "El Baul API",
                Version = "v1",
                Description = "El Baul backend, following the Exeal backend architecture conventions."
            });
            c.SupportNonNullableReferenceTypes();
            c.SchemaFilter<RequireNonNullablePropertiesSchemaFilter>();
            c.OperationFilter<DefaultResponseTypesOperationFilter>();

            // Every IParsableId<T> id (de)serializes as a plain string — see IdJsonConverter —
            // so it must document as one too, the same "string, format: uuid" shape a route Guid
            // already gets by default. Without this, Swashbuckle would introspect the struct's
            // own Value property and document `{ "value": "..." }`, which no client ever sends.
            MapIdSchema<BaulId>(c);
            MapIdSchema<ChapterId>(c);
            MapIdSchema<PhotoId>(c);
            MapIdSchema<PhotoAssetId>(c);
            MapIdSchema<PersonaId>(c);
            MapIdSchema<RecuerdoId>(c);
            MapIdSchema<SharedLinkId>(c);
            MapIdSchema<RemovalRequestId>(c);
            MapIdSchema<ClientUploadId>(c);
        });

        return services;
    }

    public static WebApplication UseElBaulApiSwagger(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "El Baul API v1");
            });
        }

        return app;
    }

    private static void MapIdSchema<TId>(SwaggerGenOptions options) where TId : struct, IParsableId<TId> =>
        options.MapType<TId>(() => new OpenApiSchema { Type = JsonSchemaType.String, Format = "uuid" });
}
