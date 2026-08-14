using ElBaul.Api.Common;
using ElBaul.Api.Controllers;
using ElBaul.Infra.Lite;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Api.Tests;

/// <summary>
/// Exercises MaintenanceModeMiddleware wired into the real pipeline (real DI, real middleware
/// order, real IAppConfiguration/IConfiguration binding) rather than invoking it directly, the
/// way MaintenanceModeMiddlewareTests does — same "needs the ASP.NET pipeline itself" reasoning
/// as the rest of ElBaul.Api.Tests (see docs/architecture/testing.md).
/// </summary>
public class MaintenanceModePipelineTests
{
    [Fact]
    public async Task WhenMaintenanceModeIsEnabled_EveryEndpointReturns503_ExceptAppConfig()
    {
        await using var app = BuildApi(maintenanceModeEnabled: true);
        await app.StartAsync();
        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

        var appConfigResponse = await client.GetAsync("/api/app-config");
        Assert.Equal(System.Net.HttpStatusCode.OK, appConfigResponse.StatusCode);

        var healthResponse = await client.GetAsync("/health");
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, healthResponse.StatusCode);

        var protectedResponse = await client.GetAsync("/api/baules");
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, protectedResponse.StatusCode);

        var body = await protectedResponse.Content.ReadAsStringAsync();
        Assert.Contains("\"error\"", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task WhenMaintenanceModeIsDisabled_RequestsAreNotShortCircuited()
    {
        await using var app = BuildApi(maintenanceModeEnabled: false);
        await app.StartAsync();
        using var client = new HttpClient { BaseAddress = new Uri(app.Urls.First()) };

        var healthResponse = await client.GetAsync("/health");
        Assert.Equal(System.Net.HttpStatusCode.OK, healthResponse.StatusCode);
    }

    private static WebApplication BuildApi(bool maintenanceModeEnabled)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Production"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Auth:JwksUri"] = "http://localhost:5000/.well-known/jwks.json",
            ["Auth:ValidIssuer"] = "http://localhost:5000",
            ["Auth:Audience"] = "el-baul-app",
            ["Auth:UserInfoEndpoint"] = "http://localhost:5000/oidc/v1/userinfo",
            ["Api:PublicUrl"] = "http://localhost:5051",
            ["App:PublicUrl"] = "http://localhost:3000",
            ["EmailLinkSigning:Key"] = "e4fba7d5a78a5f266963b6a0a2dbc57070cb66a70aa273c63b7e4270be3e6d8c",
            ["Features:ChatEnabled"] = "true",
            ["Features:ChatSuggestionsStrategy"] = "Static",
            ["Features:MaintenanceModeEnabled"] = maintenanceModeEnabled ? "true" : "false",
            ["RateLimiter:PublicLimiter:PermitLimit"] = "20",
            ["RateLimiter:ChatLimiter:PermitLimit"] = "20"
        });
        builder.Services.AddLiteInfrastructure(builder.Configuration);
        builder.Services.AddControllers().AddApplicationPart(typeof(BaulesController).Assembly);

        return ElBaulApiHost.Build(builder);
    }
}
