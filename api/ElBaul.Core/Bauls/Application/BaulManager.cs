using ElBaul.Core.Shared.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Bauls.Application;
public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IUnitOfWork unitOfWork) : IBaulManager
{
    public async Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var accesses = await baulAccess.GetAccessibleAsync(userId);

        var sharedCounts = await baulRepository.GetPersonaCountsAsync(accesses.Select(a => a.Baul.Id));

        var dtos = new List<BaulDto>();
        foreach (var access in accesses)
            dtos.Add(await ToDtoAsync(
                access.Baul, access.RoleApiString, access.IsCustodio,
                sharedCounts.GetValueOrDefault(access.Baul.Id)));

        return Result.Success<IEnumerable<BaulDto>>(dtos.OrderByDescending(d => d.UpdatedAt).ToList());
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(new BaulId(idGenerator.NewId()), name, description, userId, 0, now, now);
        var user = await userRepository.GetByIdAsync(userId);
        // The custodian's own Persona.Role is just Administrador — their real authority comes
        // from Baul.CustodioId (see BaulRole.cs), this only needs to be a sensible value for
        // anywhere Persona rows are listed/edited generically.
        var custodianPersona = new Persona(
            new PersonaId(idGenerator.NewId()), baul.Id, userId, user?.Name ?? user?.Email ?? "Custodio",
            BaulRole.Administrador, now, Name: user?.Name);

        // Both writes commit together — a Baul with no Custodio persona (or vice versa) is not
        // a state either half of the app can make sense of.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await baulRepository.CreateAsync(baul);
            await baulRepository.AddPersonaAsync(custodianPersona);
            return Result.Success();
        });

        logger.LogInformation("Baul created {BaulId} {Name}", baul.Id, name);
        return await ToDtoAsync(baul, "administrador", isCustodio: true);
    }

    public async Task<Result<BaulDto>> GetByIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul detail");
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(access.Baul, access.RoleApiString, access.IsCustodio, memberCount);
    }

    public async Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId, PhotoCrop crop)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul cover update");
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.BaulId != baulId)
        {
            logger.LogWarning("Baul cover update rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<BaulDto>(ApplicationError.NotFound("Photo not found"));
        }

        var updated = access.Baul.WithCover(photo, crop.X, crop.Y, crop.Scale, clock.UtcNow());
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {PhotoId}", photoId);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.RoleApiString, access.IsCustodio, memberCount);
    }

    public async Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul update");
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var updated = access.Baul.WithDetails(name, description, clock.UtcNow());
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {Name}", name);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.RoleApiString, access.IsCustodio, memberCount);
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, string role, bool isCustodio, int memberCount = 1)
    {
        var crop = new ImageCrop(baul.CoverCropX, baul.CoverCropY, baul.CoverCropScale);
        var coverUrl = await CoverUrlResolver.ResolveAsync(baul.CoverPhotoKey, ImagePlacement.BaulCover, photoStorage, crop);

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, role, isCustodio, memberCount,
            baul.CoverCropX, baul.CoverCropY, baul.CoverCropScale);
    }

}
