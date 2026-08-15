using System.Diagnostics;
using System.Reflection;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Chat.InputPorts;
using ElBaul.Infra;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;

namespace ElBaul.Maintenance;

/// <summary>
/// Entry point for the maintenance-command micro-framework. ElBaul.Maintenance's own
/// `Program.cs` calls <see cref="RunAsync"/> with the process args — this project builds to a
/// standalone executable (`dotnet ElBaul.Maintenance.dll <command>`), published alongside
/// `el-baul-api` in the same image/container but never referenced by `ElBaul.Api` itself. This
/// is the only place that touches hosting/DI/config/logging for maintenance work; command
/// classes hold nothing but business logic (see <see cref="IMaintenanceCommand"/>).
///
/// Config and DI are bootstrapped the exact same way the web app itself is
/// (`WebApplication.CreateBuilder` + `AddInfrastructure`), so appsettings.json /
/// appsettings.&lt;ASPNETCORE_ENVIRONMENT&gt;.json / environment variables all resolve
/// identically whether ASPNETCORE_ENVIRONMENT is Development or Production — including which
/// Serilog sinks are active (Seq is only configured in appsettings.Production.json).
/// </summary>
public static class MaintenanceCommandRunner
{
    private static readonly Lazy<IReadOnlyList<(string Name, Type Type)>> Commands = new(DiscoverCommands);

    public static async Task<int> RunAsync(string[] args)
    {
        var commandName = args.Length == 0 ? null : args[0];
        var commandType = commandName is null ? null : Commands.Value.FirstOrDefault(c => c.Name == commandName).Type;
        if (commandType is null)
        {
            Console.Error.WriteLine(commandName is null
                ? "Usage: dotnet ElBaul.Maintenance.dll <command> [--dry-run]"
                : $"Unknown maintenance command '{commandName}'.");
            Console.Error.WriteLine($"Available commands: {string.Join(", ", Commands.Value.Select(c => c.Name))}");
            return 1;
        }

        var dryRun = args.Contains("--dry-run");

        // Reuses WebApplication.CreateBuilder purely for its config loading (same
        // appsettings.json/appsettings.{ASPNETCORE_ENVIRONMENT}.json/env var resolution the
        // real app uses) — Build() never binds a port unless Run()/Start() is called, and this
        // path calls neither, so no Kestrel, no controllers, no auth pipeline. Safe to run
        // against an already-running deployment for that reason: it's a separate process, not
        // a second listener on the same port.
        var builder = WebApplication.CreateBuilder(args);

        // In Development, WebApplicationBuilder.Build() defaults to eagerly validating that
        // every registered service's full dependency graph is resolvable — a check meant for
        // the real web app, which registers its whole graph (Hangfire, every Application/
        // manager, etc.) in Program.cs. This host deliberately registers a smaller graph (just
        // AddInfrastructure() + the commands), so that validation would fail here even though
        // nothing actually unresolvable is ever resolved. Opting out restores the same
        // behavior Production already has (ValidateOnBuild defaults to false there).
        builder.Host.UseDefaultServiceProvider((_, options) => options.ValidateOnBuild = false);

        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .Enrich.WithProperty("MaintenanceCommand", commandName)
            .CreateLogger();
        builder.Host.UseSerilog();

        builder.Services.AddInfrastructure(builder.Configuration);

        // Application-layer managers aren't part of AddInfrastructure (they live in
        // ElBaul.Api.Common's manager DI graph, which this project deliberately never
        // references — see docs/architecture/backend.md). Register here, one by one, only the
        // managers a command actually needs; BackfillChatMemoriesCommand needs the real
        // IChatMemoryExtractionManager (and the IRelevantChatMemorySelector it depends on) so
        // it replays extraction through the exact same path the live app uses.
        builder.Services.AddScoped<IRelevantChatMemorySelector, RelevantChatMemorySelector>();
        builder.Services.AddScoped<IChatMemoryExtractionManager, ChatMemoryExtractionManager>();

        // BackfillPhotoContentHashesCommand/DeduplicatePhotosCommand need the real merge/soft-delete
        // domain behavior (PhotoDuplicateMergeService, and the PhotoLifecycleService it composes)
        // rather than reimplementing it — same rationale as the chat memory registrations above.
        builder.Services.AddScoped<PhotoLifecycleService>();
        builder.Services.AddScoped<PhotoDuplicateMergeService>();

        builder.Services.AddSingleton(new MaintenanceCommandArguments(args.Skip(1).Where(arg => arg != "--dry-run").ToArray()));
        foreach (var (name, type) in Commands.Value)
        {
            builder.Services.AddKeyedScoped(typeof(IMaintenanceCommand), name, type);
        }

        await using var app = builder.Build();
        using var scope = app.Services.CreateScope();

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("ElBaul.Maintenance.CommandRunner");
        var stopwatch = Stopwatch.StartNew();

        // Canonical start/finish trace: every command emits exactly these two log lines (plus
        // whatever it logs itself in between), so "did command X run, when, how long, did it
        // fail" is answerable from Seq without knowing that command's own log shape.
        logger.LogInformation(
            "Maintenance command {MaintenanceCommand} starting (dryRun={DryRun}, args={Args})",
            commandName, dryRun, args);

        int exitCode;
        try
        {
            var command = (IMaintenanceCommand)scope.ServiceProvider.GetRequiredKeyedService(typeof(IMaintenanceCommand), commandName);
            exitCode = await command.RunAsync(dryRun);

            logger.LogInformation(
                "Maintenance command {MaintenanceCommand} finished: exitCode={ExitCode}, elapsedMs={ElapsedMs}",
                commandName, exitCode, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            exitCode = 1;
            logger.LogError(ex,
                "Maintenance command {MaintenanceCommand} crashed: elapsedMs={ElapsedMs}",
                commandName, stopwatch.ElapsedMilliseconds);
        }
        finally
        {
            // Seq's sink batches and ships on a timer — without an explicit flush, a
            // short-lived CLI process can exit before the last batch (often the one carrying
            // the "finished"/"crashed" line itself) ever leaves the process.
            await Log.CloseAndFlushAsync();
        }

        return exitCode;
    }

    private static List<(string Name, Type Type)> DiscoverCommands() =>
        typeof(MaintenanceCommandRunner).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IMaintenanceCommand).IsAssignableFrom(t))
            .Select(t => (Attribute: t.GetCustomAttribute<MaintenanceCommandAttribute>(), Type: t))
            .Select(x => x.Attribute is null
                ? throw new InvalidOperationException(
                    $"{x.Type.Name} implements {nameof(IMaintenanceCommand)} but has no [{nameof(MaintenanceCommandAttribute)}] — every command must be registered with a name to be runnable.")
                : (x.Attribute.Name, x.Type))
            .ToList();
}
