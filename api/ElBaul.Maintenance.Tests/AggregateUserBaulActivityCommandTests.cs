using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Analytics;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Maintenance.Tests;

public class AggregateUserBaulActivityCommandTests
{
    [Fact]
    public async Task RunAsync_AggregatesInclusiveRange()
    {
        var aggregator = new RecordingUserBaulActivityDailyAggregator();
        var command = new AggregateUserBaulActivityCommand(
            aggregator,
            new MaintenanceCommandArguments(["--from", "2026-08-01", "--to", "2026-08-03"]),
            NullLogger<AggregateUserBaulActivityCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Equal(
            [new DateOnly(2026, 8, 1), new DateOnly(2026, 8, 2), new DateOnly(2026, 8, 3)],
            aggregator.Dates);
    }

    [Fact]
    public async Task RunAsync_WithDryRun_DoesNotAggregate()
    {
        var aggregator = new RecordingUserBaulActivityDailyAggregator();
        var command = new AggregateUserBaulActivityCommand(
            aggregator,
            new MaintenanceCommandArguments(["--from", "2026-08-01", "--to", "2026-08-01"]),
            NullLogger<AggregateUserBaulActivityCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        Assert.Empty(aggregator.Dates);
    }

    [Fact]
    public async Task RunAsync_RejectsInvalidRange()
    {
        var command = new AggregateUserBaulActivityCommand(
            new RecordingUserBaulActivityDailyAggregator(),
            new MaintenanceCommandArguments(["--from", "2026-08-03", "--to", "2026-08-01"]),
            NullLogger<AggregateUserBaulActivityCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
    }

    private sealed class RecordingUserBaulActivityDailyAggregator : IUserBaulActivityDailyAggregator
    {
        public List<DateOnly> Dates { get; } = [];

        public Task AggregateForDateAsync(DateOnly date)
        {
            Dates.Add(date);
            return Task.CompletedTask;
        }
    }
}
