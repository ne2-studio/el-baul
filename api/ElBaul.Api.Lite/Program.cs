using ElBaul.Api.Common;
using ElBaul.Infra.Lite;
using ElBaul.Ports.Output;
using Serilog;

// Bootstrap logger: catches startup failures before configuration is available.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// The only infrastructure this image knows about: everything in-memory. No Postgres, no S3,
// no Hangfire, no real OpenAI — see ElBaul.Infra.Lite.ServiceRegistration.
builder.Services.AddLiteInfrastructure(builder.Configuration);

// Everything infra-agnostic (auth, CORS, rate limiting, manager DI, middleware pipeline) is
// shared with el-baul-api via ElBaul.Api.Common — see ElBaulApiHost for what this does. Same
// compiled pipeline as the real image, just backed by different ports underneath.
var app = ElBaulApiHost.Build(builder);

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
