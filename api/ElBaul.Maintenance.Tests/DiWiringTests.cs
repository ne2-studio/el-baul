using System.Reflection;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Chat.InputPorts;
using ElBaul.Infra.Lite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ElBaul.Maintenance.Tests;

/// <summary>
/// Regression coverage for the exact failure class of the "backfill-chat-memories" outage:
/// a command's constructor asks for a service that MaintenanceCommandRunner never registers,
/// which only ever surfaces as an InvalidOperationException at `docker exec` time — no unit
/// test constructing a command directly (as every CommandTests.cs does, passing fakes by
/// hand) would ever catch it. This test instead mirrors what MaintenanceCommandRunner.RunAsync
/// actually registers (AddInfrastructure — here AddLiteInfrastructure, since real AddInfrastructure
/// needs a live Postgres connection string — plus the same Application-layer managers added
/// there for commands that need them) and, for every [MaintenanceCommand]-tagged class in the
/// assembly, resolves it as a keyed IMaintenanceCommand: any missing registration throws here
/// exactly like it would in production, for every command, not just the one that broke.
/// </summary>
public class DiWiringTests
{
    [Fact]
    public void EveryDiscoveredCommand_ResolvesFromTheMaintenanceHostContainer()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Storage:PublicUrl"] = "https://storage.example.com",
        }).Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddLiteInfrastructure(configuration);

        // Kept in lockstep with MaintenanceCommandRunner.RunAsync's own Application-layer
        // registrations — see the comment there for why they live here instead of coming from
        // AddInfrastructure.
        services.AddScoped<IRelevantChatMemorySelector, RelevantChatMemorySelector>();
        services.AddScoped<IChatMemoryExtractionManager, ChatMemoryExtractionManager>();
        services.AddScoped<PhotoLifecycleService>();
        services.AddScoped<PhotoDuplicateMergeService>();

        services.AddSingleton(new MaintenanceCommandArguments([]));

        var commandTypes = typeof(MaintenanceCommandRunner).Assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IMaintenanceCommand).IsAssignableFrom(t))
            .Select(t => (Name: t.GetCustomAttribute<MaintenanceCommandAttribute>()!.Name, Type: t))
            .ToList();

        Assert.NotEmpty(commandTypes);
        foreach (var (name, type) in commandTypes)
            services.AddKeyedScoped(typeof(IMaintenanceCommand), name, type);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        foreach (var (name, _) in commandTypes)
        {
            var command = scope.ServiceProvider.GetRequiredKeyedService(typeof(IMaintenanceCommand), name);
            Assert.NotNull(command);
        }
    }
}
