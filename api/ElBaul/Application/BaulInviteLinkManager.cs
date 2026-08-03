using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

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
        logger.LogInformation("Baul invite link created {BaulId} {BaulInviteLinkId}", baulId, active.Id);
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
        logger.LogInformation("Baul invite link regenerated {BaulId} {BaulInviteLinkId}", baulId, active.Id);
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

        return new BaulInviteLinkPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, urls);
    }

    public async Task<Result<PersonaDto>> AcceptAsync(string token)
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
