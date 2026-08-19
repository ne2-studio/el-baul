using ElBaul.Core.Sharing.Application;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.TvMode.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.TvMode.Domain;
namespace ElBaul.Core.TvMode.Application;

// See docs PRD "Modo TV". Turns the old "type a link into the TV" flow around: the TV lands on
// a fixed, baúl-agnostic URL (CreateAsync, called with no baúl in hand) and shows a QR built
// from the resulting ClaimUrl; a phone that scans it picks a baúl and calls ClaimAsync, which
// is the only place a real TvSession gets created (via ITvSessionManager, so the same
// authorization/expiry rules as the old direct-create endpoint still apply). The TV, meanwhile,
// just polls GetStatusAsync until ClaimedSessionToken shows up.
public class TvPairingManager(
    ILogger<TvPairingManager> logger,
    ITvPairingRepository tvPairingRepository,
    ITvSessionManager tvSessionManager,
    IIdGenerator idGenerator,
    IClock clock,
    IAppConfiguration appConfiguration) : ITvPairingManager
{
    // How long a freshly painted QR code stays valid before the TV has to ask for a new one —
    // much shorter than TvSessionManager's own SessionDuration (4h), since this only covers the
    // gap between "the QR is on screen" and "someone scans it", not the viewing session itself.
    private static readonly TimeSpan PairingDuration = TimeSpan.FromMinutes(10);

    public async Task<Result<CreateTvPairingResult>> CreateAsync()
    {
        if (!appConfiguration.TvModeEnabled)
            return Result.Failure<CreateTvPairingResult>(ApplicationError.NotFound("TV mode is not enabled"));

        var now = clock.UtcNow();
        var pairing = new TvPairing(
            new TvPairingId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), now, now.Add(PairingDuration));
        await tvPairingRepository.CreateAsync(pairing);

        logger.LogInformation("TV pairing created {TvPairingId}", pairing.Id);
        return Result.Success(new CreateTvPairingResult(pairing.Code, BuildClaimUrl(pairing.Code), pairing.ExpiresAt));
    }

    public async Task<Result<TvPairingStatusDto>> GetStatusAsync(string code)
    {
        if (!appConfiguration.TvModeEnabled)
            return Result.Failure<TvPairingStatusDto>(ApplicationError.NotFound("TV pairing not found"));

        var pairing = await tvPairingRepository.GetByCodeAsync(code);
        if (pairing is null || !pairing.IsActive(clock.UtcNow()))
            return Result.Failure<TvPairingStatusDto>(ApplicationError.NotFound("TV pairing not found"));

        return Result.Success(new TvPairingStatusDto(pairing.IsClaimed, pairing.ClaimedSessionToken));
    }

    public async Task<Result> ClaimAsync(string code, BaulId baulId)
    {
        if (!appConfiguration.TvModeEnabled)
            return Result.Failure(ApplicationError.NotFound("TV pairing not found"));

        var pairing = await tvPairingRepository.GetByCodeAsync(code);
        if (pairing is null || !pairing.IsActive(clock.UtcNow()) || pairing.IsClaimed)
            return Result.Failure(ApplicationError.NotFound("TV pairing not found"));

        var session = await tvSessionManager.CreateAsync(baulId);
        if (session.IsFailure) return Result.Failure(session.Error);

        await tvPairingRepository.UpdateAsync(pairing.Claim(session.Value.Token));
        logger.LogInformation("TV pairing claimed {TvPairingId} {BaulId}", pairing.Id, baulId);
        return Result.Success();
    }

    private string BuildClaimUrl(string code) =>
        $"{appConfiguration.PublicUrl.TrimEnd('/')}/tv/vincular/{Uri.EscapeDataString(code)}";
}
