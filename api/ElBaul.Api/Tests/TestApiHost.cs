using ElBaul.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Api.Tests;

/// <summary>
/// Composes the API the way the hosts do — application layer, HTTP surface, Swagger and the
/// pipeline — over whatever output-port adapters the caller already registered on the builder
/// (the tests use ElBaul.Infra.Lite's).
/// </summary>
internal static class TestApiHost
{
    public static WebApplication Build(WebApplicationBuilder builder)
    {
        builder.Services.AddElBaulCore(builder.Configuration);
        builder.Services.AddElBaulApi(builder.Configuration);
        builder.Services.AddElBaulApiSwaggerGen();

        var app = builder.Build();

        app.UseElBaulApiSwagger();
        app.UseElBaulApi();

        return app;
    }
}
