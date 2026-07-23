namespace ElBaul.Maintenance;

/// <summary>
/// Registers an <see cref="IMaintenanceCommand"/> under the name used to invoke it, e.g.
/// `dotnet ElBaul.Api.dll &lt;name&gt;`. <see cref="MaintenanceCommandRunner"/> discovers every
/// attributed command via reflection — no separate registration list to keep in sync.
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public sealed class MaintenanceCommandAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}
