using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.Personas.Domain;
namespace ElBaul.Core.Bauls.Application;
public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IPersonaRepository personaRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    CoverUrlResolver coverUrlResolver,
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

        var sharedCounts = await personaRepository.GetPersonaCountsAsync(accesses.Select(a => a.Baul.Id));

        // One batched cover-photo lookup for every baúl the user can see instead of one
        // GetByIdAsync per baúl — same batching ChapterManager.GetByBaulIdAsync/
        // AuthorInfoProjector.GetManyAsync use for their own per-row photo lookups.
        var coverPhotoIds = accesses.Where(a => a.Baul.CoverPhotoId is not null).Select(a => a.Baul.CoverPhotoId!.Value).Distinct().ToList();
        var coverPhotosById = coverPhotoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : (await photoRepository.GetByIdsAsync(coverPhotoIds)).ToDictionary(p => p.Id);

        var dtos = new List<BaulDto>();
        foreach (var access in accesses)
            dtos.Add(await ToDtoAsync(
                access.Baul, access.RoleApiString, access.IsCustodio,
                sharedCounts.GetValueOrDefault(access.Baul.Id),
                access.Baul.CoverPhotoId is { } coverPhotoId ? coverPhotosById.GetValueOrDefault(coverPhotoId) : null));

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
            new PersonaId(idGenerator.NewId()), baul.Id, userId, user?.FullName ?? user?.Email ?? "Custodio",
            BaulRole.Administrador, now, Name: user?.FullName);

        // Both writes commit together — a Baul with no Custodio persona (or vice versa) is not
        // a state either half of the app can make sense of.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await baulRepository.CreateAsync(baul);
            await personaRepository.AddPersonaAsync(custodianPersona);
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

        var memberCount = (await personaRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(access.Baul, access.RoleApiString, access.IsCustodio, memberCount);
    }

    public async Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId, ImageCrop crop)
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

        var updated = access.Baul.WithCover(photo, crop, clock.UtcNow());
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {PhotoId}", photoId);

        var memberCount = (await personaRepository.GetPersonasAsync(baulId)).Count();
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

        var memberCount = (await personaRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.RoleApiString, access.IsCustodio, memberCount);
    }

    // coverPhoto: pass the already-resolved Photo when the caller has one (e.g.
    // GetAllForCurrentUserAsync's batched lookup) to avoid a redundant GetByIdAsync; omitted
    // callers (single-baúl paths) fall back to resolving it here themselves.
    private async Task<BaulDto> ToDtoAsync(Baul baul, string role, bool isCustodio, int memberCount = 1, Photo? coverPhoto = null)
    {
        var crop = baul.CoverCrop;
        coverPhoto ??= baul.CoverPhotoId is { } coverPhotoId ? await photoRepository.GetByIdAsync(coverPhotoId) : null;
        var coverUrl = await coverUrlResolver.ResolveAsync(coverPhoto, baul.Id, ImagePlacement.BaulCover, crop);

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, role, isCustodio, memberCount,
            crop.X, crop.Y, crop.Scale);
    }

}
