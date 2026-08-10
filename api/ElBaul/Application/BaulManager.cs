using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Application;

public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IBaulManager
{
    public async Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var ownedList = owned.ToList();
        var sharedList = shared.ToList();

        var allBaulIds = ownedList.Select(b => b.Id).Concat(sharedList.Select(a => a.Baul.Id));
        var sharedCounts = await baulRepository.GetPersonaCountsAsync(allBaulIds);

        var dtos = new List<BaulDto>();
        foreach (var b in ownedList)
            dtos.Add(await ToDtoAsync(b, isCustodio: true, BaulRole.Custodio, sharedCounts.GetValueOrDefault(b.Id)));
        foreach (var a in sharedList)
            dtos.Add(await ToDtoAsync(a.Baul, isCustodio: false, a.Role, sharedCounts.GetValueOrDefault(a.Baul.Id)));

        return Result.Success<IEnumerable<BaulDto>>(dtos.OrderByDescending(d => d.UpdatedAt).ToList());
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(new BaulId(idGenerator.NewId()), name, description, userId, 0, now, now);
        await baulRepository.CreateAsync(baul);

        var user = await userRepository.GetByIdAsync(userId);
        var custodianPersona = new Persona(
            new PersonaId(idGenerator.NewId()), baul.Id, userId, user?.Name ?? user?.Email ?? "Custodio",
            BaulRole.Custodio, now, Name: user?.Name);
        await baulRepository.AddPersonaAsync(custodianPersona);

        logger.LogInformation("Baul created {BaulId} {Name}", baul.Id, name);
        return await ToDtoAsync(baul, isCustodio: true, BaulRole.Custodio);
    }

    public async Task<Result<BaulDto>> GetByIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul detail", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(access.Baul, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul cover update", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.BaulId != baulId)
        {
            logger.LogWarning("Baul cover update rejected: photo not found {BaulId} {PhotoId}", baulId, photoId);
            return Result.Failure<BaulDto>(ApplicationError.NotFound("Photo not found"));
        }

        var updated = access.Baul.WithCover(photo, clock.UtcNow());
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {BaulId} {PhotoId}", baulId, photoId);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul update", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var updated = access.Baul with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {BaulId} {Name}", baulId, name);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, bool isCustodio, BaulRole role, int memberCount = 1)
    {
        var coverUrl = await CoverUrlResolver.ResolveAsync(baul.CoverPhotoKey, ImagePlacement.BaulCover, photoStorage);

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, isCustodio, role.ToApiString(), memberCount);
    }

}
