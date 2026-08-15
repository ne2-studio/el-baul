namespace ElBaul.Core.Personas.OutputPorts;
/// <summary>
/// Fetches an externally-hosted profile picture (e.g. the OIDC provider's "picture" claim) so
/// it can be re-stored as a Persona avatar. Used only for the global-invite-link auto-created
/// Persona's best-effort avatar import — never blocks the operation it backs, so
/// implementations swallow their own failures and return null rather than throwing.
/// </summary>
public interface IProfilePictureFetcher
{
    Task<byte[]?> TryFetchAsync(string url);
}
