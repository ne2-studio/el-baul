using ElBaul.Core.Bauls;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
using ElBaul.Core.Shared.Application;
namespace ElBaul.Core.Contributions.Application;

public class ContributionsManager(
    IPhotoListReadModel photoListReadModel,
    IPhotoDtoProjector photoDtoProjector,
    ICurrentUserProvider currentUserProvider,
    IBaulAuthorizer baulAccess,
    IAppConfiguration appConfiguration) : IContributionsManager
{
    public async Task<Result<ContributionSuggestionDto?>> GetSuggestionAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Contribution suggestion");
        if (auth.IsFailure) return Result.Failure<ContributionSuggestionDto?>(auth.Error);

        // Un único sorteo por petición, igual que el cliente hacía antes por sesión — solo que
        // ahora vive donde puede crecer (más tipos, pesos por baúl, etc.) sin que el cliente se
        // entere. Sin fallback al otro tipo si el elegido no tiene fotos candidatas: mismo
        // comportamiento observable que tenían los dos endpoints por separado.
        var type = Random.Shared.NextDouble() < appConfiguration.WriteMemorySuggestionRatio
            ? ContributionSuggestionType.Memory
            : ContributionSuggestionType.Tag;

        var row = type == ContributionSuggestionType.Memory
            ? await photoListReadModel.GetMemorySuggestionAsync(baulId)
            : await photoListReadModel.GetUntaggedSuggestionAsync(baulId);
        if (row is null) return Result.Success<ContributionSuggestionDto?>(null);

        var dtos = await photoDtoProjector.ProjectAsync([row], auth.Value.IsAdmin, userId);
        return Result.Success<ContributionSuggestionDto?>(new ContributionSuggestionDto(type, dtos[0]));
    }
}
