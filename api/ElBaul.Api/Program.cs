using ElBaul.Api;
using ElBaul.Api.Common;
using ElBaul.Infra;
using ElBaul.Core.Analytics.InputPorts;
using ElBaul.Core.Notifications.InputPorts;

using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Serilog;

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

    var photoStorage = scope.ServiceProvider.GetRequiredService<ElBaul.Core.Photos.OutputPorts.IPhotoStorage>();
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
        Cron.Weekly(DayOfWeek.Sunday, 8)); // Sundays 8am UTC — everyone gets it at the same time
    recurringJobManager.AddOrUpdate<IPushDigestManager>(
        "schedule-daily-push-digests",
        m => m.ScheduleDailyPushDigestsAsync(),
        Cron.Daily(18)); // 18:00 UTC ≈ evening in Spain (19h CET / 20h CEST) — fixed, no per-user timezone yet
    recurringJobManager.AddOrUpdate<IDailyUserBaulActivityAggregationJob>(
        "aggregate-user-baul-activity-daily",
        m => m.AggregateYesterdayAsync(),
        Cron.Daily(2)); // 02:00 UTC, after the functional day in Europe/Madrid has completed
}

app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireDashboardAuthorizationFilter(app.Configuration, app.Environment)]
});

app.Run();
return 0;
