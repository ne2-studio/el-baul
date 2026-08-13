using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using ElBaul.Api.Common;
using ElBaul.Api.Controllers;
using ElBaul.Infra.Lite;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Api.Tests;

public class HttpArchitectureRulesTests
{
    private const string PublicLimiterPolicy = "PublicLimiter";

    private static readonly HashSet<EndpointContract> AnonymousEndpointAllowlist =
    [
        new("GET", "/api/app-config"),
        new("GET", "/api/baul-invites/{token}/preview"),
        new("GET", "/email/assets/logo.png"),
        new("GET", "/email/click/{token}"),
        new("GET", "/email/open/{token}.gif"),
        new("GET", "/invitacion/baul/{token}"),
        new("GET", "/s/{token}"),
        new("GET", "/api/tv-sessions/{token}"),
        new("POST", "/api/tv-pairings"),
        new("GET", "/api/tv-pairings/{code}"),
        new("GET", "/health")
    ];

    [Fact]
    public async Task ApiEndpoints_ShouldRequireAuthorization_UnlessExplicitlyAllowlistedAsAnonymous()
    {
        await using var app = BuildApi();
        await app.StartAsync();
        var violations = HttpEndpoints(app)
            .Where(endpoint => endpoint.Route.StartsWith("/api/", StringComparison.Ordinal))
            .Where(endpoint => !endpoint.AllowsAnonymous && !endpoint.RequiresAuthorization)
            .Concat(HttpEndpoints(app)
                .Where(endpoint => endpoint.Route.StartsWith("/api/", StringComparison.Ordinal))
                .Where(endpoint => endpoint.AllowsAnonymous && !AnonymousEndpointAllowlist.Contains(endpoint.Contract)))
            .Select(endpoint => $"{endpoint.Contract} ({endpoint.DisplayName})")
            .Order()
            .ToArray();

        Assert.Empty(violations);
    }

    [Fact]
    public async Task AnonymousEndpoints_ShouldBeExactlyAllowlisted_AndUseThePublicRateLimiter()
    {
        await using var app = BuildApi();
        await app.StartAsync();
        var publicEndpoints = HttpEndpoints(app)
            .Where(endpoint => endpoint.IsPublic)
            .ToArray();

        var unexpectedAnonymousEndpoints = publicEndpoints
            .Where(endpoint => !AnonymousEndpointAllowlist.Contains(endpoint.Contract))
            .Select(endpoint => $"{endpoint.Contract} ({endpoint.DisplayName})")
            .Order()
            .ToArray();

        Assert.Empty(unexpectedAnonymousEndpoints);

        var missingAnonymousEndpoints = AnonymousEndpointAllowlist
            .Except(publicEndpoints.Select(endpoint => endpoint.Contract))
            .OrderBy(endpoint => endpoint.Route)
            .ThenBy(endpoint => endpoint.Method)
            .ToArray();

        Assert.Empty(missingAnonymousEndpoints);

        var missingPublicLimiter = publicEndpoints
            .Where(endpoint => !endpoint.RateLimiterPolicies.Contains(PublicLimiterPolicy))
            .Select(endpoint => $"{endpoint.Contract} ({endpoint.DisplayName}); metadata: {string.Join(", ", endpoint.MetadataTypes)}")
            .Order()
            .ToArray();

        Assert.Empty(missingPublicLimiter);
    }

    [Fact]
    public void ApiConventions_ShouldDocumentTheAnonymousEndpointAllowlist()
    {
        var apiConventions = File.ReadAllText(Path.Combine(RepositoryRoot(), "docs", "API-CONVENTIONS.md"));
        var anonymousExceptionsSection = Regex.Match(
            apiConventions,
            @"Anonymous exceptions:\s*(?<section>.*?)\n## Errors",
            RegexOptions.Singleline);

        Assert.True(anonymousExceptionsSection.Success, "docs/API-CONVENTIONS.md must include an Anonymous exceptions section before ## Errors.");

        var documentedAnonymousEndpoints = Regex.Matches(
                anonymousExceptionsSection.Groups["section"].Value,
                @"^- `(?<method>[A-Z]+) (?<route>[^`]+)`",
                RegexOptions.Multiline)
            .Select(match => new EndpointContract(
                match.Groups["method"].Value,
                StripRouteConstraints(match.Groups["route"].Value)))
            .ToHashSet();

        var expectedAnonymousEndpoints = AnonymousEndpointAllowlist
            .Select(endpoint => new EndpointContract(endpoint.Method, StripRouteConstraints(endpoint.Route)))
            .ToHashSet();

        Assert.Empty(expectedAnonymousEndpoints.Except(documentedAnonymousEndpoints));
        Assert.Empty(documentedAnonymousEndpoints.Except(expectedAnonymousEndpoints));
    }

    private static WebApplication BuildApi()
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
            ["RateLimiter:PublicLimiter:PermitLimit"] = "20",
            ["RateLimiter:ChatLimiter:PermitLimit"] = "20"
        });
        builder.Services.AddLiteInfrastructure(builder.Configuration);
        builder.Services.AddControllers().AddApplicationPart(typeof(BaulesController).Assembly);

        return ElBaulApiHost.Build(builder);
    }

    private static IEnumerable<HttpEndpoint> HttpEndpoints(WebApplication app)
    {
        var endpoints = ((IEndpointRouteBuilder)app)
            .DataSources
            .SelectMany(dataSource => dataSource.Endpoints)
            .OfType<RouteEndpoint>();

        foreach (var endpoint in endpoints)
        {
            var httpMethods = endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods;
            if (httpMethods is null)
                continue;

            var route = "/" + endpoint.RoutePattern.RawText?.TrimStart('/');
            foreach (var method in httpMethods)
            {
                yield return new HttpEndpoint(
                    new EndpointContract(method, route),
                    endpoint.DisplayName ?? route,
                    endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null,
                    endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Count > 0,
                    RateLimiterPolicies(endpoint.Metadata),
                    endpoint.Metadata.Select(metadata => metadata.GetType().FullName ?? metadata.GetType().Name).ToArray());
            }
        }
    }

    private static HashSet<string> RateLimiterPolicies(EndpointMetadataCollection metadata) =>
        metadata
            .Select(RateLimiterPolicyName)
            .Where(policyName => policyName is not null)
            .Select(policyName => policyName!)
            .ToHashSet(StringComparer.Ordinal);

    private static string? RateLimiterPolicyName(object metadata)
    {
        if (metadata is EnableRateLimitingAttribute attribute)
            return attribute.PolicyName;

        var type = metadata.GetType();
        if (type.Namespace != "Microsoft.AspNetCore.RateLimiting")
            return null;

        return type.GetProperty("PolicyName")?.GetValue(metadata) as string;
    }

    private static string RepositoryRoot([CallerFilePath] string callerFilePath = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(callerFilePath)!);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docker-compose.yaml")))
            directory = directory.Parent;

        if (directory is null)
            throw new InvalidOperationException("Cannot locate repository root from test path.");

        return directory.FullName;
    }

    private static string StripRouteConstraints(string route) =>
        Regex.Replace(route, @":\w+(?=})", "");

    private sealed record HttpEndpoint(
        EndpointContract Contract,
        string DisplayName,
        bool AllowsAnonymous,
        bool RequiresAuthorization,
        HashSet<string> RateLimiterPolicies,
        string[] MetadataTypes)
    {
        public string Route => Contract.Route;

        public bool IsPublic => AllowsAnonymous || !RequiresAuthorization;
    }

    private sealed record EndpointContract(string Method, string Route)
    {
        public override string ToString() => $"{Method} {Route}";
    }
}
