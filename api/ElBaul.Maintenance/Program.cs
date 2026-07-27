using ElBaul.Maintenance;

// Standalone entry point for maintenance commands — run as `dotnet ElBaul.Maintenance.dll
// <command>` inside an already-running `el-baul-api` container (see
// docs/operations/maintenance-commands.md). Never referenced by ElBaul.Api; the two are
// separate processes sharing nothing but the same published output directory.
return await MaintenanceCommandRunner.RunAsync(args);
