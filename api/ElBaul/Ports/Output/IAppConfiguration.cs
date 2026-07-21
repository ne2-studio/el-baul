namespace ElBaul.Ports.Output;

/// <summary>
/// The handful of plain config values the Application layer needs (e.g. to build canonical
/// deep links). Core never references IConfiguration directly — everything config-shaped
/// that Application code needs goes through a small port like this one, implemented in Infra.
/// </summary>
public interface IAppConfiguration
{
    string PublicUrl { get; }
    string AdminTestEmailRecipient { get; }
}
