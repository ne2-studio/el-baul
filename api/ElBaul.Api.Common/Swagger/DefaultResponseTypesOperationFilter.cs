using ElBaul.Api.Controllers;
using ElBaul.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ElBaul.Api.Swagger;

/// <summary>
/// ErrorMapping.ToActionResult is called uniformly across almost every controller action and,
/// depending on the Application-layer error code at runtime, can turn into a 400, 403, 404 or
/// 503. This filter adds those shared responses (plus 401, inferred from [Authorize]) to every
/// operation on a controller that actually uses ErrorMapping, so the generated OpenAPI reflects
/// the shared error contract without every action having to repeat it. AppConfigController and
/// EmailTrackingController don't use ErrorMapping at all (config read that can't fail; a
/// redirect/404 with no JSON body) so they're excluded.
/// </summary>
public class DefaultResponseTypesOperationFilter : IOperationFilter
{
    private static readonly Type[] ExcludedControllers = [typeof(AppConfigController), typeof(EmailTrackingController)];

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Minimal API endpoints (e.g. /health) have no ControllerBase-derived DeclaringType — this
        // filter only concerns itself with MVC controllers that actually call ErrorMapping.
        var controllerType = context.MethodInfo.DeclaringType;
        if (controllerType is null || !typeof(ControllerBase).IsAssignableFrom(controllerType)) return;
        if (ExcludedControllers.Contains(controllerType)) return;

        var isAnonymous = context.MethodInfo.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any()
            || controllerType.GetCustomAttributes(true).OfType<AllowAnonymousAttribute>().Any();

        var errorSchema = context.SchemaGenerator.GenerateSchema(typeof(ErrorResponse), context.SchemaRepository);

        if (!isAnonymous)
        {
            AddResponse(operation, "401", "Missing or invalid authentication token.", schema: null);
            AddResponse(operation, "403", "The caller does not have access to this resource.", errorSchema);
        }

        AddResponse(operation, "404", "The resource does not exist.", errorSchema);
        AddResponse(operation, "400", "The request was invalid.", errorSchema);
        AddResponse(operation, "503", "A downstream dependency is unavailable.", errorSchema);
    }

    private static void AddResponse(OpenApiOperation operation, string statusCode, string description, OpenApiSchema? schema)
    {
        if (operation.Responses.ContainsKey(statusCode)) return;

        var response = new OpenApiResponse { Description = description };
        if (schema is not null)
            response.Content["application/json"] = new OpenApiMediaType { Schema = schema };

        operation.Responses[statusCode] = response;
    }
}
