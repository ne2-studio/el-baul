using ElBaul.Core.Shared.Application;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Admin.OutputPorts;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Admin.Application;
/// <summary>
/// Backs the backoffice's Dashboard/Usuarios/Baúles screens. Unlike every other manager in
/// this codebase, methods here do NOT check per-call ownership (the "load the baúl, check
/// CustodioId/Persona" pattern from BaulManager/PhotoManager/ChapterManager) — there is no
/// ownership scope for an admin read, only the AdminOnly authorization policy at the
/// controller boundary (see AdminController). This is a deliberate deviation from
/// docs/architecture/backend.md's centralized-access-control convention, not an oversight.
/// </summary>
public class AdminManager(
    IAdminRepository adminRepository,
    IAdminBaulDeletionRepository baulDeletionRepository,
    ISentEmailRepository sentEmailRepository,
    IBaulRepository baulRepository,
    IPushTokenRepository pushTokenRepository,
    IPhotoStorage photoStorage,
    IChatContextBuilder chatContextBuilder,
    IClock clock,
    ILogger<AdminManager> logger) : IAdminManager
{
    public async Task<Result<AdminDashboardCountsDto>> GetDashboardCountsAsync()
    {
        var todayUtcStart = clock.UtcNow().Date;
        var counts = await adminRepository.GetDashboardCountsAsync(todayUtcStart);
        return new AdminDashboardCountsDto(
            counts.Users, counts.Baules, counts.Photos, counts.PhotosToday,
            counts.EmailsSentLast30Days, counts.EmailsOpenedLast30Days);
    }

    public async Task<Result<IEnumerable<AdminUserListItemDto>>> GetAllUsersAsync()
    {
        var rows = await adminRepository.GetAllUsersAsync();
        return Result.Success(rows.Select(ToDto));
    }

    public async Task<Result<AdminUserDetailDto>> GetUserDetailAsync(UserId userId)
    {
        var row = await adminRepository.GetUserDetailAsync(userId);
        if (row is null) return Result.Failure<AdminUserDetailDto>(ApplicationError.NotFound("User not found"));

        var baules = row.Baules.Select(b =>
            new AdminUserBaulMembershipDto(b.BaulId.ToString(), b.BaulName, b.Role.ToApiString(), b.IsCustodio, b.PersonId.ToString()));
        var hasPushToken = (await pushTokenRepository.GetTokensForUserAsync(userId)).Any();

        return new AdminUserDetailDto(row.User.Id, row.User.Email, row.User.Name, row.User.CreatedAt, row.User.LastAccessAt, baules, hasPushToken);
    }

    public async Task<Result<IEnumerable<AdminBaulListItemDto>>> GetAllBaulesAsync()
    {
        var rows = await adminRepository.GetAllBaulesAsync();
        return Result.Success(rows.Select(ToDto));
    }

    public async Task<Result<AdminBaulDetailDto>> GetBaulDetailAsync(BaulId baulId)
    {
        var row = await adminRepository.GetBaulDetailAsync(baulId);
        if (row is null) return Result.Failure<AdminBaulDetailDto>(ApplicationError.NotFound("Baul not found"));

        var personas = row.Personas.Select(su => new AdminBaulPersonaDto(
            su.Id.ToString(),
            su.Nickname,
            su.Name,
            su.Role.ToApiString(),
            su.UserId == row.Baul.CustodioId,
            su.UserId?.ToString(),
            su.IsClaimed ? row.LinkedUserNames.GetValueOrDefault(su.UserId!.Value) : null));

        var chapters = row.Chapters.Select(a => new AdminBaulChapterDto(a.Id.ToString(), a.Name, a.PhotoCount));

        var stats = new AdminBaulStatsDto(row.PhotoCount, row.RecuerdoCount, row.Personas.Count(), row.Chapters.Count(), row.TotalSizeBytes);

        return new AdminBaulDetailDto(row.Baul.Id.ToString(), row.Baul.Name, row.Baul.CreatedAt, personas, chapters, stats);
    }

    public async Task<Result> DeleteBaulAsync(BaulId baulId)
    {
        var deletedStorageObjects = await baulDeletionRepository.DeleteBaulGraphAsync(baulId);
        if (deletedStorageObjects is null) return Result.Failure(ApplicationError.NotFound("Baul not found"));

        logger.LogWarning(
            "Baul hard-deleted ({PhotoCount} photos, {PersonaAvatarCount} persona avatars)",
            deletedStorageObjects.PhotoStorageKeys.Count, deletedStorageObjects.PersonaAvatarStorageKeys.Count);

        foreach (var key in deletedStorageObjects.AllKeys)
        {
            try
            {
                await photoStorage.DeleteAsync(key);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to clean up storage object after baul hard-delete {StorageKey}", key);
            }
        }

        return Result.Success();
    }

    public async Task<Result<IEnumerable<AdminSentEmailDto>>> GetSentEmailsAsync()
    {
        var emails = await sentEmailRepository.GetRecentAsync(200);
        return Result.Success(emails.Select(ToDto));
    }

    public async Task<Result<IEnumerable<AdminSentEmailDto>>> GetUserSentEmailsAsync(UserId userId)
    {
        var emails = await sentEmailRepository.GetByUserIdAsync(userId);
        return Result.Success(emails.Select(ToDto));
    }

    // Admin-only unlink: frees a Persona from the account that claimed it (without revoking
    // access, unlike PersonaManager.RemovePersonaAsync) so it can be claimed again by the right
    // account. Sits here rather than on PersonaManager because it's gated by the AdminOnly
    // backoffice policy, not baúl-level admin/custodio membership.
    public async Task<Result> UnlinkPersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure(ApplicationError.NotFound("Baul not found"));

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
            return Result.Failure(ApplicationError.NotFound("Persona not found"));

        if (!persona.IsClaimed)
            return Result.Failure(ApplicationError.Validation("Persona is not linked to a user"));

        if (persona.IsCustodioProtected(baul.CustodioId))
            return Result.Failure(ApplicationError.Validation("The custodio cannot be unlinked"));

        await baulRepository.UpdatePersonaAsync(persona.Unlink());
        logger.LogInformation("Persona unlinked from user by admin {PersonaId}", personaId);
        return Result.Success();
    }

    public async Task<Result<AdminChatContextDebugDto>> DebugChatContextAsync(UserId userId, BaulId baulId, string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return Result.Failure<AdminChatContextDebugDto>(ApplicationError.Validation("Message is required"));

        var row = await adminRepository.GetUserDetailAsync(userId);
        if (row is null) return Result.Failure<AdminChatContextDebugDto>(ApplicationError.NotFound("User not found"));
        if (row.Baules.All(b => b.BaulId != baulId))
            return Result.Failure<AdminChatContextDebugDto>(ApplicationError.NotFound("Baul not found for user"));

        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<AdminChatContextDebugDto>(ApplicationError.NotFound("Baul not found"));

        var context = await chatContextBuilder.BuildAsync(baul, userId, message);
        return new AdminChatContextDebugDto(baul.Id.ToString(), message, context);
    }

    private static AdminSentEmailDto ToDto(SentEmail email) =>
        new(email.Id.ToString(), email.UserId, email.Type.ToString(), email.Subject, email.RecipientEmail,
            email.Status.ToString(), email.CreatedAt, email.SentAt, email.FirstClickedAt, email.FirstOpenedAt);

    private static AdminUserListItemDto ToDto(AdminUserRow row) =>
        new(row.User.Id, row.User.Email, row.User.Name, row.User.CreatedAt, row.User.LastAccessAt, row.BaulCount);

    private static AdminBaulListItemDto ToDto(AdminBaulRow row) =>
        new(row.Baul.Id.ToString(), row.Baul.Name, row.CustodioName, row.MemberCount, row.LinkedUserCount, row.PhotoCount, row.ChapterCount, row.Baul.CreatedAt);
}
