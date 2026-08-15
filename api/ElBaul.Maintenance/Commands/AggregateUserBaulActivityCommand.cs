using System.Globalization;
using ElBaul.Core.Analytics.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Rebuilds analytics.user_baul_activity_daily for an inclusive date range. Safe to re-run:
/// each date delegates to the same idempotent day-level aggregator used by Hangfire.
/// </summary>
[MaintenanceCommand("aggregate-user-baul-activity")]
public class AggregateUserBaulActivityCommand(
    IUserBaulActivityDailyAggregator aggregator,
    MaintenanceCommandArguments arguments,
    ILogger<AggregateUserBaulActivityCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        if (!TryGetDate("--from", out var from) || !TryGetDate("--to", out var to))
        {
            logger.LogError("Usage: aggregate-user-baul-activity --from yyyy-MM-dd --to yyyy-MM-dd");
            return 1;
        }

        if (from > to)
        {
            logger.LogError("--from must be earlier than or equal to --to");
            return 1;
        }

        var count = to.DayNumber - from.DayNumber + 1;
        logger.LogInformation(
            "aggregate-user-baul-activity: {Count} day(s), from {From} to {To}{DryRunSuffix}",
            count, from, to, dryRun ? " (dry run — no changes will be saved)" : "");

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            if (dryRun)
            {
                logger.LogInformation("Would aggregate user baul activity for {Date}", date);
                continue;
            }

            await aggregator.AggregateForDateAsync(date);
        }

        return 0;
    }

    private bool TryGetDate(string name, out DateOnly date)
    {
        date = default;
        var index = arguments.Values.ToList().IndexOf(name);
        return index >= 0
            && index + 1 < arguments.Values.Count
            && DateOnly.TryParseExact(arguments.Values[index + 1], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }
}
