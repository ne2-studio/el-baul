using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Sharing;
using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Sharing;
public class BaulInviteLinkManager(
    ILogger<BaulInviteLinkManager> logger,
    IBaulInviteLinkRepository baulInviteLinkRepository,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IUserInfoClient userInfoClient,
    IProfilePictureFetcher profilePictureFetcher,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IAppConfiguration appConfiguration,
    BaulAccessService baulAccess,
    IPersonaDtoProjector personaDtoProjector) : IBaulInviteLinkManager
{
    public async Task<Result<BaulInviteLinkDto>> GetOrCreateAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul invite link get-or-create", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulInviteLinkDto>(auth.Error);

        var existing = await baulInviteLinkRepository.GetActiveByBaulIdAsync(baulId);
        if (existing is not null) return ToDto(existing);

        var link = new BaulInviteLink(new BaulInviteLinkId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), baulId, userId, clock.UtcNow());
        await baulInviteLinkRepository.CreateAsync(link);

        // CreateAsync silently no-ops if another caller won a concurrent race for this
        // baúl's one active link (see IBaulInviteLinkRepository.CreateAsync) — re-read so we
        // return whichever link actually ended up active, not necessarily `link` itself.
        var active = await baulInviteLinkRepository.GetActiveByBaulIdAsync(baulId) ?? link;
        logger.LogInformation("Baul invite link created {BaulInviteLinkId}", active.Id);
        return ToDto(active);
    }

    public async Task<Result<BaulInviteLinkDto>> RegenerateAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Baul invite link regenerate", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<BaulInviteLinkDto>(auth.Error);

        var current = await baulInviteLinkRepository.GetActiveByBaulIdAsync(baulId);
        if (current is not null)
        {
            await baulInviteLinkRepository.UpdateAsync(current with { RevokedAt = clock.UtcNow() });
        }

        var link = new BaulInviteLink(new BaulInviteLinkId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), baulId, userId, clock.UtcNow());
        await baulInviteLinkRepository.CreateAsync(link);

        var active = await baulInviteLinkRepository.GetActiveByBaulIdAsync(baulId) ?? link;
        logger.LogInformation("Baul invite link regenerated {BaulInviteLinkId}", active.Id);
        return ToDto(active);
    }

    public async Task<Result<BaulInviteLinkPreviewDto>> GetPreviewAsync(string token)
    {
        var link = await baulInviteLinkRepository.GetByTokenAsync(token);
        if (link is null || link.IsRevoked)
            return Result.Failure<BaulInviteLinkPreviewDto>(ApplicationError.NotFound("Invitation not found"));

        var baul = await baulRepository.GetByIdAsync(link.BaulId);
        if (baul is null) return Result.Failure<BaulInviteLinkPreviewDto>(ApplicationError.NotFound("Baul not found"));

        var photos = await photoRepository.GetPreviewPhotosAsync(baul.Id, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        var coverUrl = await CoverUrlResolver.ResolveAsync(baul.CoverPhotoKey, ImagePlacement.BaulCover, photoStorage);

        // Up to 4 avatars from real (non-revoked) family members, no name attached — same
        // limited-disclosure trade-off the public preview already makes for previewPhotos.
        // ProjectManyAsync batches the avatar-photo lookup for every candidate persona instead
        // of one round trip each; only the URL list itself stays capped at 4.
        var personas = await baulRepository.GetPersonasAsync(baul.Id);
        var candidates = personas.Where(p => p.Role != BaulRole.SinAcceso)
            .Select(p => (Persona: p, User: (User?)null, CanEdit: false));
        var dtos = await personaDtoProjector.ProjectManyAsync(candidates);
        var avatarUrls = dtos
            .Select(d => d.AvatarUrl)
            .Where(url => url is { Length: > 0 })
            .Select(url => url!)
            .Take(4)
            .ToList();

        return new BaulInviteLinkPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, urls, coverUrl, avatarUrls);
    }

    public async Task<Result<IEnumerable<ClaimablePersonaDto>>> GetClaimablePersonasAsync(string token)
    {
        var link = await baulInviteLinkRepository.GetByTokenAsync(token);
        if (link is null || link.IsRevoked)
            return Result.Failure<IEnumerable<ClaimablePersonaDto>>(ApplicationError.NotFound("Invitation not found"));

        var baul = await baulRepository.GetByIdAsync(link.BaulId);
        if (baul is null) return Result.Failure<IEnumerable<ClaimablePersonaDto>>(ApplicationError.NotFound("Baul not found"));

        // A caller who's already a member never needs to pick a persona — AcceptAsync ignores
        // any personaId they'd submit anyway (see the access.Persona check below), so surfacing
        // the claim step here would be a dead end. Empty list makes the frontend skip straight
        // to AcceptAsync, same as its "no claimable personas at all" path.
        var userId = currentUserProvider.GetUserId();
        var access = await baulAccess.GetAsync(baul, userId);
        if (access.Persona is not null)
            return Result.Success<IEnumerable<ClaimablePersonaDto>>([]);

        var personas = await baulRepository.GetPersonasAsync(baul.Id);
        // Projected with no User and canEdit: false purely to reuse the avatar-URL resolution
        // logic — only Id/Nickname/Name/AvatarUrl survive into the narrower DTO below, so
        // nothing else it computes (Email, Biografia, CanEdit) ever leaks to a caller who isn't
        // a baúl member yet. ProjectManyAsync batches the avatar-photo lookup for the whole
        // claimable list instead of one round trip per persona.
        var claimableItems = personas.Where(p => p.IsClaimable)
            .Select(p => (Persona: p, User: (User?)null, CanEdit: false));
        var dtos = await personaDtoProjector.ProjectManyAsync(claimableItems);
        var claimable = dtos.Select(dto => new ClaimablePersonaDto(dto.Id, dto.Nickname, dto.Name, dto.AvatarUrl)).ToList();

        return Result.Success<IEnumerable<ClaimablePersonaDto>>(claimable);
    }

    public async Task<Result<PersonaDto>> AcceptAsync(string token, PersonaId? personaId = null)
    {
        var link = await baulInviteLinkRepository.GetByTokenAsync(token);
        if (link is null || link.IsRevoked)
        {
            logger.LogWarning("Global invite acceptance rejected: link not found or revoked");
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Invitation not found"));
        }

        var baul = await baulRepository.GetByIdAsync(link.BaulId);
        if (baul is null) return Result.Failure<PersonaDto>(ApplicationError.NotFound("Baul not found"));

        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var access = await baulAccess.GetAsync(baul, userId);

        if (access.Persona?.AccessStatus == PersonaAccessStatus.Revoked)
        {
            logger.LogWarning("Global invite acceptance rejected: caller access revoked {BaulId}", link.BaulId);
            return Result.Failure<PersonaDto>(ApplicationError.Validation("You no longer have access to this baúl; ask an admin to restore it"));
        }

        if (access.Persona is not null)
        {
            // Already an active member — including the custodio, who always has a Persona
            // row (see BaulManager.CreateAsync). Joining again via the global link is a
            // no-op, not an error or a duplicate Persona.
            return await personaDtoProjector.ProjectAsync(access.Persona, user, canEdit: true);
        }

        if (personaId is { } claimId)
        {
            var target = await baulRepository.GetPersonaByIdAsync(claimId);
            if (target is null || target.BaulId != link.BaulId || !target.IsClaimable)
            {
                logger.LogWarning(
                    "Global invite claim rejected: persona not claimable {BaulId} {PersonaId}", link.BaulId, claimId);
                return Result.Failure<PersonaDto>(ApplicationError.Validation("This persona can no longer be claimed"));
            }

            var claimed = target.AcceptInvite(userId, user?.Name);
            await baulRepository.UpdatePersonaAsync(claimed);
            logger.LogInformation("Global invite accepted, existing persona claimed {BaulId} {PersonaId}", link.BaulId, claimed.Id);

            return await personaDtoProjector.ProjectAsync(claimed, user, canEdit: true);
        }

        var persona = new Persona(
            new PersonaId(idGenerator.NewId()), link.BaulId, userId, user?.Name ?? user?.Email ?? "Nuevo miembro",
            BaulRole.Colaborador, clock.UtcNow(), Name: user?.Name);
        await baulRepository.AddPersonaAsync(persona);
        logger.LogInformation("Global invite accepted, persona auto-created {BaulId} {PersonaId}", link.BaulId, persona.Id);

        persona = await TryImportAvatarAsync(persona);

        return await personaDtoProjector.ProjectAsync(persona, user, canEdit: true);
    }

    private async Task<Persona> TryImportAvatarAsync(Persona persona)
    {
        try
        {
            var accessToken = currentUserProvider.GetAccessToken();
            if (accessToken is null) return persona;

            var userInfo = await userInfoClient.GetUserInfoAsync(accessToken);
            if (userInfo?.Picture is not { Length: > 0 } pictureUrl) return persona;

            var bytes = await profilePictureFetcher.TryFetchAsync(pictureUrl);
            if (bytes is null) return persona;

            var key = StorageKey.ForPersonaAvatar(persona.Id, idGenerator.NewId(), "avatar.jpg");
            await photoStorage.SaveAsync(key, new MemoryStream(bytes), "image/jpeg");

            var updated = persona with { AvatarPhotoKey = key };
            await baulRepository.UpdatePersonaAsync(updated);
            return updated;
        }
        catch (Exception ex)
        {
            // Best-effort only — never fail the join over a decorative avatar.
            logger.LogWarning(ex, "Best-effort avatar import failed for auto-created persona {PersonaId}", persona.Id);
            return persona;
        }
    }

    private BaulInviteLinkDto ToDto(BaulInviteLink link) =>
        new(link.Token, BuildPublicUrl(link.Token), link.CreatedAt);

    private string BuildPublicUrl(string token) =>
        $"{appConfiguration.PublicUrl.TrimEnd('/')}/invitacion/baul/{Uri.EscapeDataString(token)}";
}
