using ElBaul.Application.Bauls;
using ElBaul.InputPorts.Bauls;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Bauls;
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

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var ownedList = owned.ToList();
        var sharedList = shared.ToList();

        var allBaulIds = ownedList.Select(b => b.Id).Concat(sharedList.Select(a => a.Baul.Id));
        var sharedCounts = await baulRepository.GetPersonaCountsAsync(allBaulIds);

        var dtos = new List<BaulDto>();
        foreach (var b in ownedList)
            dtos.Add(await ToDtoAsync(b, BaulRole.Custodio, sharedCounts.GetValueOrDefault(b.Id)));
        foreach (var a in sharedList)
            dtos.Add(await ToDtoAsync(a.Baul, a.Role, sharedCounts.GetValueOrDefault(a.Baul.Id)));

        return Result.Success<IEnumerable<BaulDto>>(dtos.OrderByDescending(d => d.UpdatedAt).ToList());
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(new BaulId(idGenerator.NewId()), name, description, userId, 0, now, now);
        var user = await userRepository.GetByIdAsync(userId);
        var custodianPersona = new Persona(
            new PersonaId(idGenerator.NewId()), baul.Id, userId, user?.Name ?? user?.Email ?? "Custodio",
            BaulRole.Custodio, now, Name: user?.Name);

        // Both writes commit together — a Baul with no Custodio persona (or vice versa) is not
        // a state either half of the app can make sense of.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await baulRepository.CreateAsync(baul);
            await baulRepository.AddPersonaAsync(custodianPersona);
            return Result.Success();
        });

        logger.LogInformation("Baul created {BaulId} {Name}", baul.Id, name);
        return await ToDtoAsync(baul, BaulRole.Custodio);
    }

    public async Task<Result<BaulDto>> GetByIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul detail", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(access.Baul, access.Role, memberCount);
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
            logger.LogWarning("Baul cover update rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<BaulDto>(ApplicationError.NotFound("Photo not found"));
        }

        var updated = access.Baul.WithCover(photo, clock.UtcNow());
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {PhotoId}", photoId);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul update", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulDto>(auth.Error);
        var access = auth.Value;

        var updated = access.Baul with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {Name}", name);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.Role, memberCount);
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, BaulRole role, int memberCount = 1)
    {
        var coverUrl = await CoverUrlResolver.ResolveAsync(baul.CoverPhotoKey, ImagePlacement.BaulCover, photoStorage);

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, role.ToApiString(), memberCount);
    }

}
