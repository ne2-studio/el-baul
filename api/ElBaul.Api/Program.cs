using System.Threading.RateLimiting;
using ElBaul.Api.Logging;
using ElBaul.Api.Tools;
using ElBaul.Application;
using ElBaul.Infra;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

// One-off maintenance commands take over the whole process instead of starting the web
// server — run via `docker exec <container> dotnet ElBaul.Api.dll <command>` against an
// already-running deployment (see api/README.md), never by the web process itself.
if (args.Length > 0 && args[0] == "backfill-exif-dates")
{
    return await BackfillExifDatesCommand.RunAsync(args);
}

// Bootstrap logger: catches startup failures before configuration is available.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
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

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = builder.Configuration["Auth:ValidIssuer"],
        ValidAudience = builder.Configuration["Auth:Audience"],
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
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(context.Exception, "JWT authentication failed");
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

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

    options.OnRejected = async (context, token) =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        logger.LogWarning("Rate limit exceeded for {IP}", ip);

        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync("Too many requests.");
    };
});

// Register application services
builder.Services.AddScoped<IBaulManager, BaulManager>();
builder.Services.AddScoped<IAlbumManager, AlbumManager>();
builder.Services.AddScoped<IPhotoManager, PhotoManager>();
builder.Services.AddScoped<IUserManager, UserManager>();

// Register infrastructure services
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Run database migrations and ensure the photo storage bucket exists on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ElBaulDbContext>();
    await dbContext.Database.MigrateAsync();

    var photoStorage = scope.ServiceProvider.GetRequiredService<ElBaul.Ports.Output.IPhotoStorage>();
    await photoStorage.EnsureBucketExistsAsync();
}

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
    .AllowAnyHeader());

app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<UserLogContextMiddleware>();
app.UseMiddleware<UserSyncMiddleware>();
app.UseAuthorization();

app.MapControllers();

// Public, unauthenticated endpoint — rate-limited per the architecture convention.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .RequireRateLimiting("PublicLimiter");

app.Run();
return 0;
