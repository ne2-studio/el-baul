using System.Security.Claims;
using System.Threading.RateLimiting;
using ElBaul.Api;
using ElBaul.Api.Logging;
using ElBaul.Application;
using ElBaul.Infra;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

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
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "El Baul API",
                Version = "v1",
                Description = "El Baul backend, following the Exeal backend architecture conventions."
            });
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
        builder.Services.AddScoped<IBaulManager, BaulManager>();
        builder.Services.AddScoped<IPersonaManager, PersonaManager>();
        builder.Services.AddScoped<IRemovalRequestManager, RemovalRequestManager>();
        builder.Services.AddScoped<IChapterManager, ChapterManager>();
        builder.Services.AddScoped<IPhotoManager, PhotoManager>();
        builder.Services.AddScoped<IUserManager, UserManager>();
        builder.Services.AddScoped<ISupportManager, SupportManager>();
        builder.Services.AddScoped<IChatContextBuilder, ChatContextBuilder>();
        builder.Services.AddScoped<IChatManager, ChatManager>();
        builder.Services.AddScoped<IAdminManager, AdminManager>();
        builder.Services.AddScoped<IWelcomeEmailManager, WelcomeEmailManager>();
        builder.Services.AddScoped<IWeeklyDigestManager, WeeklyDigestManager>();
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
        app.UseMiddleware<UserSyncMiddleware>();
        app.UseAuthorization();

        app.MapControllers();

        // Public, unauthenticated endpoint — rate-limited per the architecture convention.
        app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
            .RequireRateLimiting("PublicLimiter");

        return app;
    }
}

// ElBaulApiHost itself is static and can't be used as an ILogger<T> category — this is just a
// stable name for the log lines emitted from inside it.
file sealed class ElBaulApiHostLogCategory;
