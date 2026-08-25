using ElBaul.Core.Users.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Bauls;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.Shared.Application;
namespace ElBaul.Core.Personas.Application;
public class PersonaManager(
    ILogger<PersonaManager> logger,
    IBaulPhotoCoverListener baulPhotoCoverListener,
    IPersonaRepository personaRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IBaulAuthorizer baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoUploadWorkflow photoUploadWorkflow,
    IPersonaDtoProjector personaDtoProjector,
    IUnitOfWork unitOfWork,
    IAppConfiguration appConfiguration) : IPersonaManager
{
    public async Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Personas list");
        if (auth.IsFailure) return Result.Failure<IEnumerable<PersonaDto>>(auth.Error);
        var access = auth.Value;

        var personas = (await personaRepository.GetPersonasAsync(baulId)).ToList();

        // One batched user lookup for every claimed persona instead of one round trip each,
        // plus IPersonaDtoProjector.ProjectManyAsync batching the avatar-photo lookup the same
        // way — together this turns what used to be up to 2 queries per persona into 2 fixed
        // queries for the whole list.
        var claimedUserIds = personas.Where(p => p.IsClaimed).Select(p => p.UserId!.Value).Distinct();
        var usersById = (await userRepository.GetByIdsAsync(claimedUserIds)).ToDictionary(u => u.Id);

        var items = personas.Select(persona => (
            Persona: persona,
            User: persona.IsClaimed ? usersById.GetValueOrDefault(persona.UserId!.Value) : null,
            CanEdit: CanEditPersona(persona, userId, access)));

        var dtos = await personaDtoProjector.ProjectManyAsync(items, access.CustodioId);
        return Result.Success<IEnumerable<PersonaDto>>(dtos);
    }

    public async Task<Result<PersonaDto>> GetPersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona detail", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);
        var access = auth.Value;

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona detail rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<PersonaDto>(personaResult.Error);
        var persona = personaResult.Value;

        var canEdit = CanEditPersona(persona, userId, access);
        return await personaDtoProjector.ProjectAsync(persona, canEdit, access.CustodioId);
    }

    public async Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona creation");
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = new Persona(
            new PersonaId(idGenerator.NewId()), baulId, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await personaRepository.AddPersonaAsync(persona);
        logger.LogInformation("Persona created {PersonaId} {Nickname}", persona.Id, nickname);
        return await personaDtoProjector.ProjectAsync(persona, canEdit: true, auth.Value.CustodioId);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona update rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<PersonaDto>(personaResult.Error);
        var persona = personaResult.Value;

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
        {
            logger.LogWarning("Persona update rejected: access denied {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Forbidden("Access denied"));
        }

        var updated = persona.WithIdentity(name, nickname);
        await personaRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona updated {PersonaId}", personaId);

        return await personaDtoProjector.ProjectAsync(updated, canEdit, auth.Value.CustodioId);
    }

    // Biografía is shared, wiki-like family content: unlike name/nickname/avatar it only
    // requires baúl membership, not CanEditPersona's identity-edit permission.
    public async Task<Result<PersonaDto>> UpdatePersonaBiografiaAsync(BaulId baulId, PersonaId personaId, string? biografia)
    {
        if (!appConfiguration.BiografiaEnabled)
        {
            logger.LogWarning("Persona biografia update rejected: biografia is not enabled");
            return Result.Failure<PersonaDto>(ApplicationError.Validation("Biografia is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona biografia update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona biografia update rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<PersonaDto>(personaResult.Error);
        var persona = personaResult.Value;

        var updated = persona.WithBiografia(biografia);
        await personaRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona biografia updated {PersonaId}", personaId);

        return await personaDtoProjector.ProjectAsync(updated, CanEditPersona(updated, userId, auth.Value), auth.Value.CustodioId);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        BaulId baulId,
        PersonaId personaId,
        Stream content,
        ImageCrop crop,
        ClientUploadId clientUploadId)
    {
        var context = await AuthorizePersonaAvatarChangeAsync(baulId, personaId);
        if (context.IsFailure) return Result.Failure<PersonaDto>(context.Error);
        var (persona, access, userId) = context.Value;

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        Photo photo;
        if (existingPhoto is not null)
        {
            if (existingPhoto.BaulId != baulId || existingPhoto.Status != PhotoStatus.Active)
                return Result.Failure<PersonaDto>(ApplicationError.NotFound("Photo not found"));

            photo = existingPhoto;
            logger.LogInformation(
                "Duplicate persona avatar upload reused existing loose photo {PersonaId} {PhotoId} {ClientUploadId}",
                personaId, photo.Id, clientUploadId);
        }
        else
        {
            var photoResult = await photoUploadWorkflow.CreatePhotoAsync(
                baulId, chapterId: null, userId, content,
                clientUploadId, uploadBatchId: null,
                (createdPhoto, now) => baulPhotoCoverListener.OnPhotoAddedAsync(baulId, createdPhoto.Id, now));
            if (photoResult.IsFailure) return Result.Failure<PersonaDto>(photoResult.Error);
            // AlreadyExisted is irrelevant here: whether these bytes were just stored as a new
            // loose photo or turned out to exactly match one already in the baúl, either way
            // photo is a real, active photo this persona's avatar can point at.
            photo = photoResult.Value.Photo;
        }

        return await ApplyPersonaAvatarPhotoAsync(persona, access, userId, photo, crop);
    }

    public async Task<Result<PersonaDto>> SetPersonaAvatarPhotoAsync(BaulId baulId, PersonaId personaId, PhotoId photoId, ImageCrop crop)
    {
        var context = await AuthorizePersonaAvatarChangeAsync(baulId, personaId);
        if (context.IsFailure) return Result.Failure<PersonaDto>(context.Error);
        var (persona, access, userId) = context.Value;

        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            photo => photo.BaulId == baulId && photo.Status == PhotoStatus.Active,
            logger,
            "Persona avatar photo selection rejected: photo not found in this baúl {PersonaId} {PhotoId}",
            "Photo not found",
            personaId,
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PersonaDto>(photoResult.Error);
        var photo = photoResult.Value;

        return await ApplyPersonaAvatarPhotoAsync(persona, access, userId, photo, crop);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaRoleAsync(BaulId baulId, PersonaId personaId, BaulRole role)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona role update");
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona role update rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<PersonaDto>(personaResult.Error);
        var persona = personaResult.Value;

        // Custody isn't a role this endpoint can grant or take away — it can't even be asked
        // for, since BaulRole has no Custodio value (see BaulRole.cs). Touching the actual
        // custodio's own row would let one strip their own protected status, so that's the one
        // case left to block. Ownership only ever moves via Baul.CustodioId.
        if (persona.IsCustodioProtected(auth.Value.CustodioId))
        {
            logger.LogWarning("Persona role update rejected: custodio role cannot be changed {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Validation("The custodio role cannot be changed"));
        }

        var updated = persona.WithRole(role);
        await personaRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona role updated {PersonaId} {Role}", personaId, role);

        return await personaDtoProjector.ProjectAsync(updated, canEdit: true, auth.Value.CustodioId);
    }

    public async Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona removal");
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona access revocation rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure(personaResult.Error);
        var persona = personaResult.Value;

        if (persona.IsCustodioProtected(auth.Value.CustodioId))
        {
            logger.LogWarning("Persona access revocation rejected: custodio cannot lose access {PersonaId}", personaId);
            return Result.Failure(ApplicationError.Validation("The custodio cannot lose access"));
        }

        await personaRepository.UpdatePersonaAsync(persona.Revoke());
        logger.LogInformation("Persona access revoked {PersonaId}", personaId);
        return Result.Success();
    }

    private static bool CanEditPersona(Persona target, UserId callerUserId, BaulAuthorization callerAccess) =>
        callerAccess.IsAdmin || (target.AccessStatus == PersonaAccessStatus.Active && target.UserId == callerUserId);

    private async Task<Result<(Persona Persona, BaulAuthorization Access, UserId UserId)>> AuthorizePersonaAvatarChangeAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona avatar update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<(Persona, BaulAuthorization, UserId)>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona avatar update rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<(Persona, BaulAuthorization, UserId)>(personaResult.Error);
        var persona = personaResult.Value;

        if (!CanEditPersona(persona, userId, auth.Value))
        {
            logger.LogWarning("Persona avatar update rejected: access denied {PersonaId}", personaId);
            return Result.Failure<(Persona, BaulAuthorization, UserId)>(ApplicationError.Forbidden("Access denied"));
        }

        return (persona, auth.Value, userId);
    }

    private async Task<Result<PersonaDto>> ApplyPersonaAvatarPhotoAsync(Persona persona, BaulAuthorization access, UserId userId, Photo photo, ImageCrop crop)
    {
        var existingIds = (await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photo.Id)).ToList();

        var updated = persona.WithAvatarPhoto(photo, crop);

        // Tagging the persona into their own new avatar photo and assigning the avatar commit
        // together — SetTagsAsync bulk-deletes/reinserts via ExecuteDeleteAsync (bypasses the
        // change tracker, see IUnitOfWork's doc comment), so only an ambient transaction makes
        // it atomic with the persona update.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (!existingIds.Contains(persona.Id))
            {
                await photoPersonaTagRepository.SetTagsAsync(photo.Id, photo.BaulId, existingIds.Append(persona.Id), clock.UtcNow());
            }

            await personaRepository.UpdatePersonaAsync(updated);
            return Result.Success();
        });
        logger.LogInformation("Persona avatar photo updated {PersonaId} {PhotoId}", persona.Id, photo.Id);

        return await personaDtoProjector.ProjectAsync(updated, CanEditPersona(updated, userId, access), access.CustodioId);
    }
}
