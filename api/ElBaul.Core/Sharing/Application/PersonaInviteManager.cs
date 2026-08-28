using ElBaul.Core.Bauls;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.Application;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Sharing.Application;
// Persona-scoped, directed invitations — replaces the old baúl-scoped, regenerable global
// invite link (BaulInviteLinkManager, deleted). Each Persona owns at most one invite token
// (see Persona.InviteToken), issued lazily on the first "Invitar" tap and re-shared, never
// regenerated, on later taps while the persona stays Pending.
public class PersonaInviteManager(
    ILogger<PersonaInviteManager> logger,
    IPersonaRepository personaRepository,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    CoverUrlResolver coverUrlResolver,
    IIdGenerator idGenerator,
    ICurrentUserProvider currentUserProvider,
    IAppConfiguration appConfiguration,
    BaulAccessService baulAccess,
    IPersonaDtoProjector personaDtoProjector) : IPersonaInviteManager
{
    public async Task<Result<PersonaInviteDto>> InviteAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona invite");
        if (auth.IsFailure) return Result.Failure<PersonaInviteDto>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona invite rejected: persona not found {PersonaId}",
            "Persona not found",
            personaId);
        if (personaResult.IsFailure) return Result.Failure<PersonaInviteDto>(personaResult.Error);
        var persona = personaResult.Value;

        if (persona.IsClaimed)
        {
            logger.LogWarning("Persona invite rejected: persona already claimed {PersonaId}", personaId);
            return Result.Failure<PersonaInviteDto>(ApplicationError.Validation("This persona already belongs to the baúl"));
        }

        if (persona.Role == BaulRole.SinAcceso)
        {
            logger.LogWarning("Persona invite rejected: persona has no access {PersonaId}", personaId);
            return Result.Failure<PersonaInviteDto>(ApplicationError.Validation("This persona does not have access to the baúl"));
        }

        var token = persona.InviteToken;
        if (token is null)
        {
            var updated = persona.IssueInviteToken(TokenGenerator.NewToken(idGenerator));
            await personaRepository.UpdatePersonaAsync(updated);
            token = updated.InviteToken!;
            logger.LogInformation("Persona invite token issued {BaulId} {PersonaId}", baulId, personaId);
        }

        return Result.Success(new PersonaInviteDto(token, BuildPublicUrl(token)));
    }

    public async Task<Result<PersonaInvitePreviewDto>> GetPreviewAsync(string token)
    {
        var target = await personaRepository.GetPersonaByInviteTokenAsync(token);
        if (target is null) return Result.Failure<PersonaInvitePreviewDto>(ApplicationError.NotFound("Invitation not found"));

        var baul = await baulRepository.GetByIdAsync(target.BaulId);
        if (baul is null) return Result.Failure<PersonaInvitePreviewDto>(ApplicationError.NotFound("Baul not found"));

        var photos = await photoRepository.GetPreviewPhotosAsync(baul.Id, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        var coverCrop = baul.CoverCrop;
        var coverPhoto = baul.CoverPhotoId is { } coverPhotoId ? await photoRepository.GetByIdAsync(coverPhotoId) : null;
        var coverUrl = await coverUrlResolver.ResolveAsync(coverPhoto, baul.Id, ImagePlacement.BaulCover, coverCrop);

        // Up to 4 avatars from real family members, no name attached — same limited-disclosure
        // trade-off the public preview already made when this lived on BaulInviteLinkManager.
        // ProjectManyAsync batches the avatar-photo lookup for every candidate persona instead
        // of one round trip each; only the URL list itself stays capped at 4.
        var personas = await personaRepository.GetPersonasAsync(baul.Id);
        var candidates = personas.Select(p => (Persona: p, User: (Users.Domain.User?)null, CanEdit: false));
        var dtos = await personaDtoProjector.ProjectManyAsync(candidates, baul.CustodioId);
        var avatarUrls = dtos
            .Select(d => d.AvatarUrl)
            .Where(url => url is { Length: > 0 })
            .Select(url => url!)
            .Take(4)
            .ToList();

        return new PersonaInvitePreviewDto(baul.Id.ToString(), baul.Name, baul.Description, urls, coverUrl, avatarUrls);
    }

    public async Task<Result<PersonaInviteLandingDto>> GetLandingAsync(string token)
    {
        var target = await personaRepository.GetPersonaByInviteTokenAsync(token);
        if (target is null) return Result.Failure<PersonaInviteLandingDto>(ApplicationError.NotFound("Invitation not found"));

        var baul = await baulRepository.GetByIdAsync(target.BaulId);
        if (baul is null) return Result.Failure<PersonaInviteLandingDto>(ApplicationError.NotFound("Baul not found"));

        var coverCrop = baul.CoverCrop;
        var coverPhoto = baul.CoverPhotoId is { } coverPhotoId ? await photoRepository.GetByIdAsync(coverPhotoId) : null;
        var coverUrl = await coverUrlResolver.ResolveAsync(coverPhoto, baul.Id, ImagePlacement.BaulCover, coverCrop);
        var title = $"Invitación a {baul.Name}";
        var description = string.IsNullOrWhiteSpace(baul.Description)
            ? $"Te han invitado a unirte al baúl familiar {baul.Name}."
            : baul.Description;

        return Result.Success(new PersonaInviteLandingDto(
            title, description, coverUrl, BuildAppUrl(token), baul.Name));
    }

    public async Task<Result<PersonaDto>> AcceptAsync(string token)
    {
        var target = await personaRepository.GetPersonaByInviteTokenAsync(token);
        if (target is null)
        {
            logger.LogWarning("Persona invite acceptance rejected: token not found");
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Invitation not found"));
        }

        var baul = await baulRepository.GetByIdAsync(target.BaulId);
        if (baul is null) return Result.Failure<PersonaDto>(ApplicationError.NotFound("Baul not found"));

        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var access = await baulAccess.GetAsync(baul, userId);

        if (access.Persona is not null)
        {
            // Already an active member of this baúl — including via a different persona row,
            // or a repeat tap on the same invite once already accepted. Either way, joining
            // again is a no-op, not an error or a second Persona.
            return await personaDtoProjector.ProjectWithResolvedUserAsync(access.Persona, user, canEdit: true, baul.CustodioId);
        }

        if (target.IsClaimed)
        {
            // The token resolves to a real persona, but it's already claimed by someone else
            // and the caller isn't a member — same "no longer valid" outcome as an unknown
            // token, so we don't disclose that the persona exists.
            logger.LogWarning("Persona invite acceptance rejected: persona already claimed by another account {PersonaId}", target.Id);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Invitation not found"));
        }

        var claimed = target.AcceptInvite(userId, user?.FullName);
        await personaRepository.UpdatePersonaAsync(claimed);
        logger.LogInformation("Persona invite accepted {BaulId} {PersonaId}", target.BaulId, claimed.Id);

        return await personaDtoProjector.ProjectWithResolvedUserAsync(claimed, user, canEdit: true, baul.CustodioId);
    }

    private string BuildPublicUrl(string token) =>
        $"{appConfiguration.ApiPublicUrl.TrimEnd('/')}/invitacion/baul/{Uri.EscapeDataString(token)}";

    // entry=link marca la sesión como llegada por enlace compartido para analytics.session-open
    // (ver app/src/utils/entrySource.ts). Es el CTA de la landing pública el que entra a la app,
    // así que es aquí donde se estampa, no en BuildPublicUrl (esa URL la abren también crawlers).
    private string BuildAppUrl(string token) =>
        $"{appConfiguration.PublicUrl.TrimEnd('/')}/invitacion/baul/{Uri.EscapeDataString(token)}?entry=link";
}
