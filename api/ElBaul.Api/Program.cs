using ElBaul.Api;
using ElBaul.Api.Common;
using ElBaul.Infra;
using ElBaul.Maintenance;
using ElBaul.Ports.Input;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Serilog;

// One-off maintenance commands take over the whole process instead of starting the web
// server — run via `docker exec <container> dotnet ElBaul.Api.dll <command>` against an
// already-running deployment (see api/README.md), never by the web process itself. Commands
// themselves live in ElBaul.Maintenance (see MaintenanceCommandRunner.cs) so ElBaul.Api
// doesn't carry one-off business logic — this is just the dispatch point.
if (await MaintenanceCommandRunner.TryRunAsync(args) is { } maintenanceExitCode)
{
    return maintenanceExitCode;
}

// Bootstrap logger: catches startup failures before configuration is available.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Register infrastructure services
builder.Services.AddInfrastructure(builder.Configuration);

// Background jobs (welcome-email scheduling) — storage sits on the same Postgres instance as
// the rest of the app, no separate infra to run.
builder.Services.AddHangfire(config => config
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"))));
builder.Services.AddHangfireServer();

// Everything infra-agnostic (auth, CORS, rate limiting, manager DI, middleware pipeline) is
// shared with el-baul-api-lite via ElBaul.Api.Common — see ElBaulApiHost for what this does.
var app = ElBaulApiHost.Build(builder);

// Run database migrations and ensure the photo storage bucket exists on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ElBaulDbContext>();
    await dbContext.Database.MigrateAsync();

    var photoStorage = scope.ServiceProvider.GetRequiredService<ElBaul.Ports.Output.IPhotoStorage>();
    await photoStorage.EnsureBucketExistsAsync();

    // Service-based API (not the static RecurringJob.AddOrUpdate) — the static one relies on
    // JobStorage.Current, which Hangfire's own ASP.NET Core integration warns against.
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobManager.AddOrUpdate<IWelcomeEmailManager>(
        "schedule-pending-welcome-emails",
        m => m.SchedulePendingWelcomeEmailsAsync(),
        Cron.Hourly);
    recurringJobManager.AddOrUpdate<IWeeklyDigestManager>(
        "schedule-weekly-digests",
        m => m.ScheduleWeeklyDigestsAsync(),
        Cron.Daily(4)); // 4am UTC — once a day is enough per PRD, off-peak hour
}

app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireDashboardAuthorizationFilter(app.Configuration, app.Environment)]
});

app.Run();
return 0;
