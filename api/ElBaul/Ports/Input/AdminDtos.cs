namespace ElBaul.Ports.Input;

// Backoffice DTOs. ExternalLinks (Dashboard's tool shortcuts) are deliberately not part of
// AdminDashboardCountsDto — they're config, assembled at the Api layer (AdminController)
// straight from IConfiguration, same pattern as AppConfigController's feature flags. Core
// (this project) never references IConfiguration.
public record AdminDashboardCountsDto(int RegisteredUsers, int TotalBaules, int TotalPhotos, int PhotosUploadedToday);

public record AdminUserBaulMembershipDto(string BaulId, string BaulName, string Role, string PersonId);
public record AdminUserListItemDto(string Id, string Email, string? Name, DateTime CreatedAt, DateTime? LastAccessAt, int BaulCount);
public record AdminUserDetailDto(string Id, string Email, string? Name, DateTime CreatedAt, DateTime? LastAccessAt, IEnumerable<AdminUserBaulMembershipDto> Baules);

public record AdminBaulListItemDto(string Id, string Name, string CustodioName, int MemberCount, int LinkedUserCount, int PhotoCount, int ChapterCount, DateTime CreatedAt);
public record AdminBaulPersonaDto(string PersonId, string Nickname, string? Name, string Role, string? LinkedUserId, string? LinkedUserName);
public record AdminBaulChapterDto(string Id, string Name, int PhotoCount);
public record AdminBaulStatsDto(int Photos, int Recuerdos, int Personas, int Chapters);
public record AdminBaulDetailDto(
    string Id,
    string Name,
    DateTime CreatedAt,
    IEnumerable<AdminBaulPersonaDto> Personas,
    IEnumerable<AdminBaulChapterDto> Chapters,
    AdminBaulStatsDto Stats
);

public record AdminSentEmailDto(
    string Id, string UserId, string Type, string Subject, string RecipientEmail, string Status,
    DateTime CreatedAt, DateTime? SentAt, DateTime? FirstClickedAt);
