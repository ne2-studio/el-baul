using ElBaul.Api.Logging;
using ElBaul.Api.Models;
using ElBaul.Api.Swagger;
using ElBaul.Application.Admin;
using ElBaul.Application.Analytics;
using ElBaul.Application.Bauls;
using ElBaul.Application.Chapters;
using ElBaul.Application.Chat;
using ElBaul.Application.Feed;
using ElBaul.Application.Notifications;
using ElBaul.Application.Personas;
using ElBaul.Application.Photos;
using ElBaul.Application.Recuerdos;
using ElBaul.Application.Sharing;
using ElBaul.Application.Support;
using ElBaul.Application.Users;
using ElBaul.Infra;
using ElBaul.InputPorts.Admin;
using ElBaul.InputPorts.Analytics;
using ElBaul.InputPorts.Bauls;
using ElBaul.InputPorts.Chapters;
using ElBaul.InputPorts.Chat;
using ElBaul.InputPorts.Feed;
using ElBaul.InputPorts.Notifications;
using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Photos;
using ElBaul.InputPorts.Recuerdos;
using ElBaul.InputPorts.Sharing;
using ElBaul.InputPorts.Support;
using ElBaul.InputPorts.Users;
using Ne2Studio.Common;
using System.ComponentModel;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Swashbuckle.AspNetCore.SwaggerGen;

using ElBaul.Domain;
namespace ElBaul.Api.Common;

/// <summary>
/// Everything about the HTTP host that doesn't depend on which infrastructure is registered
/// behind the ports — auth, CORS, rate limiting, the application-layer manager wiring, and the
/// middleware pipeline. Shared between el-baul-api (Program.cs) and el-baul-api-lite
/// (ElBaul.Api.Lite/Program.cs) so the two images run the exact same compiled pipeline and
/// can never silently diverge on it. Each caller registers its own infrastructure
/// (AddInfrastructure/AddLiteInfrastructure) on builder.Services *before* calling Build, and
/// handles its own infra-specific concerns (Hangfire, migrations, bucket setup, the Hangfire
/// dashboard route) after it returns.
/// </summary>
public static class ElBaulApiHost
{
    public static WebApplication Build(WebApplicationBuilder builder)
    {
        RegisterIdTypeConverters();

        builder.Services.AddControllers()
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new IdJsonConverterFactory()));
        builder.Services.AddEndpointsApiExplorer();

        // Keeps every 400 in the one { "error": "..." } shape API-CONVENTIONS.md documents —
        // whether it's a hand-checked Application-layer Validation error going through
        // ErrorMapping, or an id/primitive value ASP.NET itself couldn't bind (IdTypeConverter,
        // IdJsonConverter, or a plain Guid?/int query/route value) — instead of letting the
        // latter fall through to [ApiController]'s default ValidationProblemDetails body.
        builder.Services.Configure<ApiBehaviorOptions>(options =>
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
        builder.Services.AddSwaggerGen(c =>
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
            MapIdSchema<PersonaId>(c);
            MapIdSchema<RecuerdoId>(c);
            MapIdSchema<SharedLinkId>(c);
            MapIdSchema<BaulInviteLinkId>(c);
            MapIdSchema<RemovalRequestId>(c);
            MapIdSchema<ClientUploadId>(c);
        });
        builder.Services.AddCors();

        // Reconfigure logging now that appsettings/environment config is available
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .CreateLogger();

        builder.Host.UseSerilog();

        // Add Authentication Services
        builder.Services.AddAuthentication(options =>
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
            var jwksUri = builder.Configuration["Auth:JwksUri"]
                ?? throw new InvalidOperationException("Missing required configuration: Auth:JwksUri");

            JsonWebKeySet? cachedJwks = null;
            var jwksLock = new object();

            // The admin backoffice (admin/) is registered as a separate Zitadel client id from the
            // consumer app (el-baul-app), so its tokens carry a different "aud" — Auth:ValidAudiences
            // lists every client id this API accepts, falling back to the single Auth:Audience if
            // it isn't configured (local dev, and any deployment that hasn't set it yet).
            var validAudiences = builder.Configuration.GetSection("Auth:ValidAudiences").Get<string[]>()
                ?? [builder.Configuration["Auth:Audience"] ?? throw new InvalidOperationException("Missing required configuration: Auth:Audience")];

            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer = builder.Configuration["Auth:ValidIssuer"],
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
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<ElBaulApiHostLogCategory>>();
                    logger.LogWarning(context.Exception, "JWT authentication failed");
                    return Task.CompletedTask;
                }
            };
        });

        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireAssertion(ctx => AdminRoleAuthorization.HasAdminRole(ctx.User)));
        });

        // Public, unauthenticated endpoints must still be rate-limited (keyed by client IP).
        builder.Services.AddRateLimiter(options =>
        {
            options.AddPolicy("PublicLimiter", context =>
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = builder.Configuration.GetValue<int>("RateLimiter:PublicLimiter:PermitLimit"),
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
                    PermitLimit = builder.Configuration.GetValue<int>("RateLimiter:ChatLimiter:PermitLimit"),
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });
            });

            options.OnRejected = async (context, token) =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<ElBaulApiHostLogCategory>>();
                var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                logger.LogWarning("Rate limit exceeded for {IP}", ip);

                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsync("Too many requests.");
            };
        });

        // Register application services
        builder.Services.AddScoped<BaulAccessService>();
        builder.Services.AddScoped<AuthorInfoProjector>();
        builder.Services.AddScoped<PhotoLifecycleService>();
        builder.Services.AddScoped<PhotoFileService>();
        builder.Services.AddScoped<PhotoUploadWorkflow>();
        builder.Services.AddScoped<IPhotoDtoProjector, PhotoDtoProjector>();
        builder.Services.AddScoped<IPersonaDtoProjector, PersonaDtoProjector>();
        builder.Services.AddScoped<IBaulManager, BaulManager>();
        builder.Services.AddScoped<IPersonaManager, PersonaManager>();
        builder.Services.AddScoped<IRemovalRequestManager, RemovalRequestManager>();
        builder.Services.AddScoped<IChapterManager, ChapterManager>();
        builder.Services.AddScoped<IPhotoManager, PhotoManager>();
        builder.Services.AddScoped<IRecuerdoManager, RecuerdoManager>();
        builder.Services.AddScoped<IBaulFeedManager, BaulFeedManager>();
        builder.Services.AddScoped<IPhotoPersonaTagManager, PhotoPersonaTagManager>();
        builder.Services.AddScoped<IUserManager, UserManager>();
        builder.Services.AddScoped<IPushNotificationManager, PushNotificationManager>();
        builder.Services.AddScoped<ISupportManager, SupportManager>();
        builder.Services.AddScoped<IRelevantRecuerdoSelector, RelevantRecuerdoSelector>();
        builder.Services.AddScoped<IChatContextBuilder, ChatContextBuilder>();
        builder.Services.AddScoped<IChatManager, ChatManager>();
        builder.Services.AddScoped<ISharedLinkManager, SharedLinkManager>();
        builder.Services.AddScoped<IBaulInviteLinkManager, BaulInviteLinkManager>();

        // "Ai" costs a real AI call every time the chat opens with no history and can fail;
        // "Static" (the default) is deterministic templates filled from the baúl's own
        // personas/capítulos and never fails. See ISuggestedQuestionsStrategy.
        if (string.Equals(builder.Configuration["Features:ChatSuggestionsStrategy"], "Ai", StringComparison.OrdinalIgnoreCase))
            builder.Services.AddScoped<ISuggestedQuestionsStrategy, AiSuggestedQuestionsStrategy>();
        else
            builder.Services.AddScoped<ISuggestedQuestionsStrategy, StaticSuggestedQuestionsStrategy>();
        builder.Services.AddScoped<IAdminManager, AdminManager>();
        builder.Services.AddScoped<IDailyUserBaulActivityAggregationJob, DailyUserBaulActivityAggregationJob>();
        builder.Services.AddScoped<IWelcomeEmailManager, WelcomeEmailManager>();
        builder.Services.AddScoped<DigestActivityPolicy>();
        builder.Services.AddScoped<IWeeklyDigestManager, WeeklyDigestManager>();
        builder.Services.AddScoped<IPushDigestManager, PushDigestManager>();
        builder.Services.AddScoped<EmailDeliveryCoordinator>();

        var app = builder.Build();

        // Configure the HTTP request pipeline
        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "El Baul API v1");
            });
        }

        app.UseSerilogRequestLogging();

        app.UseRouting();

        app.UseCors(policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
            // Content-Disposition isn't in the browser's default CORS-safelisted response
            // headers, so without this the photo download endpoint's filename is invisible to
            // fetch() and silently falls back to a generic name.
            .WithExposedHeaders("Content-Disposition"));

        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseMiddleware<UserLogContextMiddleware>();
        app.UseMiddleware<RouteIdLogContextMiddleware>();
        app.UseMiddleware<UserSyncMiddleware>();
        app.UseAuthorization();

        app.MapControllers();

        // Public, unauthenticated endpoint — rate-limited per the architecture convention.
        app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
            .RequireRateLimiting("PublicLimiter")
            .Produces<HealthResponse>(StatusCodes.Status200OK);

        return app;
    }

    private static readonly Lock IdTypeConverterRegistrationLock = new();
    private static bool _idTypeConvertersRegistered;

    // TypeDescriptor.AddAttributes, not a [TypeConverter] attribute on the id structs themselves
    // — see IdTypeConverter's own doc comment for why. Guarded against running twice: this runs
    // once per call to Build(), and HttpArchitectureRulesTests calls it more than once per test
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
            RegisterIdTypeConverter<PersonaId>();
            RegisterIdTypeConverter<RecuerdoId>();
            RegisterIdTypeConverter<SharedLinkId>();
            RegisterIdTypeConverter<BaulInviteLinkId>();
            RegisterIdTypeConverter<RemovalRequestId>();
            RegisterIdTypeConverter<ClientUploadId>();
        }
    }

    private static void RegisterIdTypeConverter<TId>() where TId : struct, IParsableId<TId> =>
        TypeDescriptor.AddAttributes(typeof(TId), new TypeConverterAttribute(typeof(IdTypeConverter<TId>)));

    private static void MapIdSchema<TId>(SwaggerGenOptions options) where TId : struct, IParsableId<TId> =>
        options.MapType<TId>(() => new OpenApiSchema { Type = "string", Format = "uuid" });

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

// ElBaulApiHost itself is static and can't be used as an ILogger<T> category — this is just a
// stable name for the log lines emitted from inside it.
file sealed class ElBaulApiHostLogCategory;
