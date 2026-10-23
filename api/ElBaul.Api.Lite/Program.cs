using ElBaul.Api;
using ElBaul.Core;
using ElBaul.Infra.Lite;
using ElBaul.Core.Photos.OutputPorts;
using Serilog;

// Bootstrap logger: catches startup failures before configuration is available.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Reconfigure logging now that appsettings/environment config is available.
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();
builder.Host.UseSerilog();

// The only infrastructure this image knows about: everything in-memory. No Postgres, no S3,
// no Hangfire, no real OpenAI — see ElBaul.Infra.Lite.ServiceRegistration.
builder.Services.AddLiteInfrastructure(builder.Configuration);

// The application layer and the HTTP surface (auth, CORS, rate limiting, controllers, pipeline)
// are the same ones ElBaul.Host composes; only the infrastructure above differs.
builder.Services.AddElBaulCore(builder.Configuration);
builder.Services.AddElBaulApi(builder.Configuration);
builder.Services.AddElBaulApiSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();
app.UseElBaulApiSwagger();
app.UseSerilogRequestLogging();
app.UseElBaulApi();

// Lite-only: the frontend renders photo URLs as a plain <img src>, with no bearer token
// attached, so LitePhotoStorage.GetImageUrl points here instead of at a real imgproxy (which
// this image doesn't have). Deliberately unauthenticated — this image never holds real user
// data, only whatever gets uploaded during a test run and lost on restart.
// Catch-all, not {key}: keys contain a literal '/' (see LitePhotoStorage.GetImageUrl), and a
// plain {key} segment parameter never gets that slash back after routing decodes it.
app.MapGet("/lite/photos/{*key}", async (string key, IPhotoStorage storage) =>
{
    var content = await storage.OpenReadForDownloadAsync(key);
    return Results.File(content.Content, content.ContentType);
});

app.Run();
