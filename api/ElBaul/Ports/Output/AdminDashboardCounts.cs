namespace ElBaul.Ports.Output;

/// <summary>
/// Raw DB counts for the backoffice dashboard. External tool links are not part of this —
/// they're config, read straight from IConfiguration at the Api layer (AdminController),
/// same pattern as AppConfigController's feature flags.
/// </summary>
public record AdminDashboardCounts(int Users, int Baules, int Photos, int PhotosToday);
