using ElBaul.Api.Auth;
using ElBaul.Api.Models;
using ElBaul.Api.Scope;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
using System.ComponentModel;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Ne2Studio.Common;

namespace ElBaul.Api;

/// <summary>
/// The API's DI seam: controllers and their id binding, the one error shape, authentication and
/// authorization, CORS, rate limiting, and the HTTP-bound adapters of the ports that identify
/// the caller. Everything the HTTP surface needs that does not depend on which infrastructure
/// sits behind the output ports, so the real host and the in-memory one compile the same
/// pipeline and cannot drift. Hosts register the application layer (AddElBaulCore) and their own
/// output-port adapters themselves; see UseElBaulApi for the pipeline half.
/// </summary>
public static class ElBaulApiServiceCollectionExtensions
{
    public static IServiceCollection AddElBaulApi(this IServiceCollection services, IConfiguration configuration)
    {
        RegisterIdTypeConverters();

        services.AddControllers()
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new IdJsonConverterFactory()));
        services.AddEndpointsApiExplorer();

        // Keeps every 400 in the one { "error": "..." } shape API-CONVENTIONS.md documents —
        // whether it's a hand-checked Application-layer Validation error going through
        // ErrorMapping, or an id/primitive value ASP.NET itself couldn't bind (IdTypeConverter,
        // IdJsonConverter, or a plain Guid?/int query/route value) — instead of letting the
        // latter fall through to [ApiController]'s default ValidationProblemDetails body.
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var message = context.ModelState.Values
                    .SelectMany(entry => entry.Errors)
                    .Select(ExtractMessage)
                    .FirstOrDefault(text => !string.IsNullOrEmpty(text))
                    ?? "The request was invalid.";

                return ErrorMapping.ToActionResult(ApplicationError.Validation(message));
            };
        });

        services.AddCors();

        // Add Authentication Services
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            // The backend reaches the OIDC provider over the internal Docker network, but the
            // token's "iss" claim — and every URL in the provider's discovery document, jwks_uri
            // included — is set to the address the *browser* used to sign in. Those two addresses
            // differ locally (fake-oidc:5000 vs localhost:5000), so instead of letting JwtBearer
            // follow the discovery document's (browser-facing, internally unreachable) jwks_uri,
            // signing keys are fetched directly from an internally-reachable Auth:JwksUri, and the
            // expected issuer is configured independently as Auth:ValidIssuer.
            var jwksUri = configuration["Auth:JwksUri"]
                ?? throw new InvalidOperationException("Missing required configuration: Auth:JwksUri");

            JsonWebKeySet? cachedJwks = null;
            var jwksLock = new object();

            // The admin backoffice (admin/) is registered as a separate Zitadel client id from the
            // consumer app (el-baul-app), so its tokens carry a different "aud" — Auth:ValidAudiences
            // lists every client id this API accepts, falling back to the single Auth:Audience if
            // it isn't configured (local dev, and any deployment that hasn't set it yet).
            var validAudiences = configuration.GetSection("Auth:ValidAudiences").Get<string[]>()
                ?? [configuration["Auth:Audience"] ?? throw new InvalidOperationException("Missing required configuration: Auth:Audience")];

            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer = configuration["Auth:ValidIssuer"],
                ValidAudiences = validAudiences,
                IssuerSigningKeyResolver = (_, _, _, _) =>
                {
                    lock (jwksLock)
                    {
                        cachedJwks ??= new JsonWebKeySet(new HttpClient().GetStringAsync(jwksUri).GetAwaiter().GetResult());
                    }
                    return cachedJwks.GetSigningKeys();
                }
            };
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<ElBaulApiLogCategory>>();
                    logger.LogWarning(context.Exception, "JWT authentication failed");
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireAssertion(ctx => AdminRoleAuthorization.HasAdminRole(ctx.User)));
        });

        // Public, unauthenticated endpoints must still be rate-limited (keyed by client IP).
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("PublicLimiter", context =>
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = configuration.GetValue<int>("RateLimiter:PublicLimiter:PermitLimit"),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });
            });

            // Each chat message costs real money against a real OpenAI key, so it's keyed by user
            // (not IP, like PublicLimiter) — this policy only ever applies to authenticated requests.
            // AddRateLimiter policies run outside the normal per-request DI scope, so the claim is
            // read directly here instead of via ICurrentUserProvider (see HttpContextCurrentUserProvider
            // for the equivalent DI-resolvable lookup used everywhere else).
            options.AddPolicy("ChatLimiter", context =>
            {
                var userId = context.User.FindFirstValue("sub")
                    ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? "anonymous";
                return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = configuration.GetValue<int>("RateLimiter:ChatLimiter:PermitLimit"),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });
            });

            options.OnRejected = async (context, token) =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<ElBaulApiLogCategory>>();
                var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                logger.LogWarning("Rate limit exceeded for {IP}", ip);

                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsync("Too many requests.");
            };
        });

        // The HTTP-bound adapters of the Core ports that identify the caller.
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();
        services.AddHttpClient<IUserInfoClient, OidcUserInfoClient>();

        // HTTP-layer aggregators over the application services above.
        services.AddScoped<BaulScopeAggregator>();
        services.AddScoped<ChapterScopeAggregator>();
        services.AddScoped<PersonaScopeAggregator>();

        return services;
    }

    private static readonly Lock IdTypeConverterRegistrationLock = new();
    private static bool _idTypeConvertersRegistered;

    // TypeDescriptor.AddAttributes, not a [TypeConverter] attribute on the id structs themselves
    // — see IdTypeConverter's own doc comment for why. Guarded against running twice: this runs
    // once per call to AddElBaulApi(), and HttpArchitectureRulesTests calls it more than once per test
    // process; TypeDescriptor's registration is process-wide and re-adding the same attribute
    // repeatedly would just layer redundant (harmless but pointless) converters.
    private static void RegisterIdTypeConverters()
    {
        lock (IdTypeConverterRegistrationLock)
        {
            if (_idTypeConvertersRegistered) return;
            _idTypeConvertersRegistered = true;

            RegisterIdTypeConverter<BaulId>();
            RegisterIdTypeConverter<ChapterId>();
            RegisterIdTypeConverter<PhotoId>();
            RegisterIdTypeConverter<PhotoAssetId>();
            RegisterIdTypeConverter<PersonaId>();
            RegisterIdTypeConverter<RecuerdoId>();
            RegisterIdTypeConverter<SharedLinkId>();
            RegisterIdTypeConverter<RemovalRequestId>();
            RegisterIdTypeConverter<ClientUploadId>();
            RegisterIdTypeConverter<ChatMemoryId>();
        }
    }

    private static void RegisterIdTypeConverter<TId>() where TId : struct, IParsableId<TId> =>
        TypeDescriptor.AddAttributes(typeof(TId), new TypeConverterAttribute(typeof(IdTypeConverter<TId>)));

    // Prefers a JsonException's own message over ModelError.ErrorMessage when one is attached —
    // this is a partial mitigation, not a full fix. Both binding paths a bad id can take
    // (IdTypeConverter for a route/query value, IdJsonConverter for a [FromBody] property) end
    // up going through one of ASP.NET's own canned DefaultModelBindingMessageProvider templates
    // ("The value 'x' is not valid.", or "The request field is required." when a [FromBody]
    // property's converter exception fails the whole body read) rather than surfacing the
    // converter's own "'x' is not a valid <id>" message — by design: ASP.NET does not trust an
    // arbitrary IModelBinder/TypeConverter/JsonConverter's exception message to be safe to show
    // a client. So a malformed id still reaches the client as a generic but correctly-shaped
    // { "error": "..." } — see IdBindingTests (api/acceptance-tests) for what's actually
    // observable. Getting the specific per-id message all the way to the response body would
    // need replacing SimpleTypeModelBinder/SystemTextJsonInputFormatter's own exception handling
    // rather than working within ApiBehaviorOptions — not done here; this factory's job is the
    // shape guarantee (never ASP.NET's default ValidationProblemDetails), which holds either way.
    private static string? ExtractMessage(ModelError error) =>
        FindJsonExceptionMessage(error.Exception)
        ?? (string.IsNullOrEmpty(error.ErrorMessage) ? null : error.ErrorMessage);

    private static string? FindJsonExceptionMessage(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
            if (current is JsonException) return current.Message;
        return null;
    }
}

// The extension class above is static and can't be used as an ILogger<T> category — this is just
// a stable name for the log lines emitted from inside it.
file sealed class ElBaulApiLogCategory;
