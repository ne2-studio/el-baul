namespace ElBaul.Maintenance;

/// <summary>
/// A one-off maintenance command's business logic — nothing else. Hosting, config, DI
/// bootstrap, dry-run flag parsing, logging setup, and canonical start/finish/timing
/// instrumentation all live in <see cref="MaintenanceCommandRunner"/>; an implementation only
/// decides what to do for one item and what to do with the dry-run flag.
///
/// Take dependencies via constructor injection (resolved from the same DI container
/// <c>AddInfrastructure</c> wires up for the web app) and return the process exit code:
/// <c>0</c> if every item succeeded, non-zero if any item failed. An unhandled exception is
/// also treated as failure by the runner, so a command only needs its own try/catch around a
/// per-item loop to keep going past a single item's failure — it does not need one around the
/// whole method.
/// </summary>
public interface IMaintenanceCommand
{
    Task<int> RunAsync(bool dryRun);
}
