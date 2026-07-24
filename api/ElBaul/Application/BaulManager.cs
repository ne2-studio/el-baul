using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IBaulManager
{
    // Recuerdo author names are always the Persona's apodo for this baúl, never the
    // underlying account's OIDC-synced name — duplicated from ChapterManager/PhotoManager,
    // same reasoning: a nickname is what the family chose, the account name may be unset.
    private async Task<(string Nickname, string? AvatarUrl, string? PersonaId)> GetAuthorInfoAsync(BaulId baulId, string userId)
    {
        var persona = await baulRepository.GetPersonaByUserIdAsync(baulId, userId);
        var avatarUrl = persona?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (persona?.Nickname ?? "Usuario", avatarUrl, persona?.Id.ToString());
    }

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

    public async Task<Result<BaulDto>> GetByIdAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null) return Result.Failure<BaulDto>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<BaulDto>("Access denied");

        var memberCount = (await baulRepository.GetPersonasAsync(id)).Count();
        return await ToDtoAsync(baul, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> SetCoverAsync(Guid baulId, Guid photoId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null)
        {
            logger.LogWarning("Baul cover update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<BaulDto>("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Baul cover update rejected: access denied {BaulId}", baulId);
            return Result.Failure<BaulDto>("Access denied");
        }

        var photo = await photoRepository.GetByIdAsync(new PhotoId(photoId));
        if (photo is null || photo.BaulId != id)
        {
            logger.LogWarning("Baul cover update rejected: photo not found {BaulId} {PhotoId}", baulId, photoId);
            return Result.Failure<BaulDto>("Photo not found");
        }

        var updated = baul with { CoverPhotoKey = photo.StorageKey, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {BaulId} {PhotoId}", baulId, photoId);

        var memberCount = (await baulRepository.GetPersonasAsync(id)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> UpdateAsync(Guid baulId, string name, string? description)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null)
        {
            logger.LogWarning("Baul update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<BaulDto>("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Baul update rejected: access denied {BaulId}", baulId);
            return Result.Failure<BaulDto>("Access denied");
        }

        var updated = baul with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {BaulId} {Name}", baulId, name);

        var memberCount = (await baulRepository.GetPersonasAsync(id)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, bool isCustodio, BaulRole role, int memberCount = 1)
    {
        var coverUrl = baul.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(baul.CoverPhotoKey, ImagePlacement.BaulCover)
            : null;

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, isCustodio, role.ToApiString(), memberCount);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(id)).ToList();

        var chapterNames = (await chapterRepository.GetByBaulIdAsync(id)).ToDictionary(a => a.Id, a => a.Name);

        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var thumbnailUrls = new Dictionary<PhotoId, string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is not null)
                thumbnailUrls[photoId] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        }

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(id, recuerdo.UserId);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            var chapterName = recuerdo.ChapterId is { } chapterId ? chapterNames.GetValueOrDefault(chapterId) : null;
            dtos.Add(ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapterName));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid baulId, string text)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null)
        {
            logger.LogWarning("Recuerdo creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<RecuerdoDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(id, userId);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), null, null, id, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {RecuerdoId}", baulId, recuerdo.Id);

        return ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: null);
    }

    private static RecuerdoDto ToRecuerdoDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn, string? photoThumbnailUrl,
        string? chapterName) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId, recuerdo.ChapterId?.ToString(), chapterName);
}
