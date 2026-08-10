using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

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
    ISentEmailRepository sentEmailRepository,
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    ISharedLinkRepository sharedLinkRepository,
    IBaulInviteLinkRepository baulInviteLinkRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
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
        return new AdminDashboardCountsDto(counts.Users, counts.Baules, counts.Photos, counts.PhotosToday);
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
            new AdminUserBaulMembershipDto(b.BaulId.ToString(), b.BaulName, b.Role.ToApiString(), b.PersonId.ToString()));
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
            su.UserId,
            su.IsClaimed ? row.LinkedUserNames.GetValueOrDefault(su.UserId!) : null));

        var chapters = row.Chapters.Select(a => new AdminBaulChapterDto(a.Id.ToString(), a.Name, a.PhotoCount));

        var stats = new AdminBaulStatsDto(row.PhotoCount, row.RecuerdoCount, row.Personas.Count(), row.Chapters.Count(), row.TotalSizeBytes);

        return new AdminBaulDetailDto(row.Baul.Id.ToString(), row.Baul.Name, row.Baul.CreatedAt, personas, chapters, stats);
    }

    /// <summary>
    /// Hard-deletes a baúl and everything in it: recuerdos, photo-persona tags, photos (incl.
    /// soft-deleted ones and their storage blobs), chapters, personas, and pending removal
    /// requests. Deletion order matters — Photo/Recuerdo/PhotoPersonaTag have Restrict FKs to
    /// Baul (or, for PhotoPersonaTag, to Photo and Persona — see PhotoConfiguration/
    /// RecuerdoConfiguration/PhotoPersonaTagConfiguration) specifically to avoid
    /// multiple-cascade-path errors, so those rows must be gone before the Baul row itself can
    /// go — PhotoPersonaTag first, since it references both Photo and Persona. Chapters/
    /// Personas/RemovalRequests do cascade at the DB level, but are deleted explicitly anyway
    /// so behavior doesn't depend on which backend (Postgres vs. the in-memory Lite
    /// repositories) is running.
    /// </summary>
    public async Task<Result> DeleteBaulAsync(BaulId baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure(ApplicationError.NotFound("Baul not found"));

        var photos = (await photoRepository.GetAllByBaulIdAsync(baulId)).ToList();
        var personas = (await baulRepository.GetPersonasAsync(baulId)).ToList();

        await photoPersonaTagRepository.DeleteByBaulIdAsync(baulId);
        await sharedLinkRepository.DeleteByBaulIdAsync(baulId);
        await baulInviteLinkRepository.DeleteByBaulIdAsync(baulId);
        await recuerdoRepository.DeleteByBaulIdAsync(baulId);
        await photoRepository.DeleteByBaulIdAsync(baulId);
        await chapterRepository.DeleteByBaulIdAsync(baulId);
        await baulRepository.RemoveAllPersonasAsync(baulId);
        await baulRepository.DeleteAllRemovalRequestsAsync(baulId);
        await baulRepository.DeleteAsync(baulId);

        logger.LogWarning(
            "Baul hard-deleted ({PhotoCount} photos, {PersonaCount} personas)", photos.Count, personas.Count);

        var storageKeys = photos.Select(p => p.StorageKey)
            .Concat(personas.Where(p => !string.IsNullOrEmpty(p.AvatarPhotoKey)).Select(p => p.AvatarPhotoKey!));

        foreach (var key in storageKeys)
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

        var context = await chatContextBuilder.BuildAsync(baul, message);
        return new AdminChatContextDebugDto(baul.Id.ToString(), message, context);
    }

    private static AdminSentEmailDto ToDto(SentEmail email) =>
        new(email.Id.ToString(), email.UserId, email.Type.ToString(), email.Subject, email.RecipientEmail,
            email.Status.ToString(), email.CreatedAt, email.SentAt, email.FirstClickedAt);

    private static AdminUserListItemDto ToDto(AdminUserRow row) =>
        new(row.User.Id, row.User.Email, row.User.Name, row.User.CreatedAt, row.User.LastAccessAt, row.BaulCount);

    private static AdminBaulListItemDto ToDto(AdminBaulRow row) =>
        new(row.Baul.Id.ToString(), row.Baul.Name, row.CustodioName, row.MemberCount, row.LinkedUserCount, row.PhotoCount, row.ChapterCount, row.Baul.CreatedAt);
}
