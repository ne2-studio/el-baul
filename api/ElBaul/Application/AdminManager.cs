using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Backs the backoffice's Dashboard/Usuarios/Baúles screens. Unlike every other manager in
/// this codebase, methods here do NOT check per-call ownership (the "load the baúl, check
/// CustodioId/SharedUser" pattern from BaulManager/PhotoManager/AlbumManager) — there is no
/// ownership scope for an admin read, only the AdminOnly authorization policy at the
/// controller boundary (see AdminController). This is a deliberate deviation from
/// docs/ARCHITECTURE.md's "access control is checked explicitly inside each use-case
/// method" convention, not an oversight.
/// </summary>
public class AdminManager(IAdminRepository adminRepository, ISentEmailRepository sentEmailRepository, IClock clock) : IAdminManager
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

    public async Task<Result<AdminUserDetailDto>> GetUserDetailAsync(string userId)
    {
        var row = await adminRepository.GetUserDetailAsync(userId);
        if (row is null) return Result.Failure<AdminUserDetailDto>("User not found");

        var baules = row.Baules.Select(b =>
            new AdminUserBaulMembershipDto(b.BaulId.ToString(), b.BaulName, b.Role.ToApiString(), b.PersonId.ToString()));

        return new AdminUserDetailDto(row.User.Id, row.User.Email, row.User.Name, row.User.CreatedAt, row.User.LastAccessAt, baules);
    }

    public async Task<Result<IEnumerable<AdminBaulListItemDto>>> GetAllBaulesAsync()
    {
        var rows = await adminRepository.GetAllBaulesAsync();
        return Result.Success(rows.Select(ToDto));
    }

    public async Task<Result<AdminBaulDetailDto>> GetBaulDetailAsync(Guid baulId)
    {
        var row = await adminRepository.GetBaulDetailAsync(baulId);
        if (row is null) return Result.Failure<AdminBaulDetailDto>("Baul not found");

        var personas = row.SharedUsers.Select(su => new AdminBaulPersonaDto(
            su.Id.ToString(),
            su.Nickname,
            su.Name,
            su.Role.ToApiString(),
            su.UserId,
            su.UserId is not null ? row.LinkedUserNames.GetValueOrDefault(su.UserId) : null));

        var capitulos = row.Albums.Select(a => new AdminBaulAlbumDto(a.Id.ToString(), a.Name, a.PhotoCount));

        var stats = new AdminBaulStatsDto(row.PhotoCount, row.RecuerdoCount, row.SharedUsers.Count(), row.Albums.Count());

        return new AdminBaulDetailDto(row.Baul.Id.ToString(), row.Baul.Name, row.Baul.CreatedAt, personas, capitulos, stats);
    }

    public async Task<Result<IEnumerable<AdminSentEmailDto>>> GetSentEmailsAsync()
    {
        var emails = await sentEmailRepository.GetRecentAsync(200);
        return Result.Success(emails.Select(ToDto));
    }

    private static AdminSentEmailDto ToDto(SentEmail email) =>
        new(email.Id.ToString(), email.UserId, email.Type.ToString(), email.Subject, email.RecipientEmail,
            email.Status.ToString(), email.CreatedAt, email.SentAt, email.FirstClickedAt);

    private static AdminUserListItemDto ToDto(AdminUserRow row) =>
        new(row.User.Id, row.User.Email, row.User.Name, row.User.CreatedAt, row.User.LastAccessAt, row.BaulCount);

    private static AdminBaulListItemDto ToDto(AdminBaulRow row) =>
        new(row.Baul.Id.ToString(), row.Baul.Name, row.CustodioName, row.MemberCount, row.PhotoCount, row.AlbumCount, row.Baul.CreatedAt);
}
