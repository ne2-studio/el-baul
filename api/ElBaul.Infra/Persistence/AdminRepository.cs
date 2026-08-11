using ElBaul.OutputPorts.Admin;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

/// <summary>
/// Backs the backoffice's cross-aggregate, unscoped reads directly against
/// ElBaulDbContext — the one deliberate exception to the "repositories own a single
/// aggregate" convention, alongside MinioPhotoStorage's singleton exception. Admin queries
/// join across Users/Baules/Personas/Photos/Chapters/Recuerdos with no per-user ownership
/// check, which doesn't fit any single existing repository's contract.
/// </summary>
public class AdminRepository(ElBaulDbContext dbContext) : IAdminRepository
{
    public async Task<AdminDashboardCounts> GetDashboardCountsAsync(DateTime todayUtcStart)
    {
        var users = await dbContext.Users.CountAsync();
        var baules = await dbContext.Baules.CountAsync();
        // Active-only, same rule every other Photos query in the codebase applies (see
        // PhotoRepository/PhotoListReadModel) — a soft-deleted photo's row survives the delete,
        // but it shouldn't inflate the count an admin reads as "how many photos exist".
        var photos = await dbContext.Photos.CountAsync(p => p.Status == PhotoStatus.Active);
        var photosToday = await dbContext.Photos.CountAsync(p => p.Status == PhotoStatus.Active && p.CreatedAt >= todayUtcStart);

        return new AdminDashboardCounts(users, baules, photos, photosToday);
    }

    public async Task<IEnumerable<AdminUserRow>> GetAllUsersAsync()
    {
        // Persona.IsClaimed can't be used here — this Where runs server-side as SQL, and EF
        // can't translate a C#-only computed property, only the raw column check it wraps.
        var baulCounts = await dbContext.Personas
            .Where(su => su.UserId != null)
            .GroupBy(su => su.UserId!)
            .Select(g => new { UserId = g.Key, Count = g.Select(su => su.BaulId).Distinct().Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var users = await dbContext.Users.AsNoTracking().OrderByDescending(u => u.CreatedAt).ToListAsync();

        return users.Select(u => new AdminUserRow(u, baulCounts.GetValueOrDefault(u.Id)));
    }

    public async Task<AdminUserDetailRow?> GetUserDetailAsync(string userId)
    {
        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        var baules = await dbContext.Personas
            .AsNoTracking()
            .Where(su => su.UserId == userId)
            .Join(dbContext.Baules.AsNoTracking(), su => su.BaulId, b => b.Id,
                (su, b) => new AdminUserBaulRow(b.Id, b.Name, su.Role, su.Id))
            .ToListAsync();

        return new AdminUserDetailRow(user, baules);
    }

    public async Task<IEnumerable<AdminBaulRow>> GetAllBaulesAsync()
    {
        var memberCounts = await dbContext.Personas
            .GroupBy(su => su.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BaulId, x => x.Count);

        // Same SQL-translation constraint as GetAllUsersAsync above — Persona.IsClaimed can't
        // be used in a server-side Where here.
        var linkedUserCounts = await dbContext.Personas
            .Where(su => su.UserId != null)
            .GroupBy(su => su.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BaulId, x => x.Count);

        // Active-only — see GetDashboardCountsAsync's comment.
        var photoCounts = await dbContext.Photos
            .Where(p => p.Status == PhotoStatus.Active)
            .GroupBy(p => p.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BaulId, x => x.Count);

        var chapterCounts = await dbContext.Chapters
            .GroupBy(a => a.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BaulId, x => x.Count);

        var baules = await dbContext.Baules.AsNoTracking().OrderByDescending(b => b.CreatedAt).ToListAsync();
        var custodioIds = baules.Select(b => b.CustodioId).Distinct().ToList();
        var custodioNames = await dbContext.Users.AsNoTracking()
            .Where(u => custodioIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);

        return baules.Select(b => new AdminBaulRow(
            b,
            custodioNames.GetValueOrDefault(b.CustodioId, b.CustodioId),
            memberCounts.GetValueOrDefault(b.Id),
            linkedUserCounts.GetValueOrDefault(b.Id),
            photoCounts.GetValueOrDefault(b.Id),
            chapterCounts.GetValueOrDefault(b.Id)));
    }

    public async Task<AdminBaulDetailRow?> GetBaulDetailAsync(BaulId baulId)
    {
        var baul = await dbContext.Baules.AsNoTracking().FirstOrDefaultAsync(b => b.Id == baulId);
        if (baul is null) return null;

        var personas = await dbContext.Personas.AsNoTracking().Where(su => su.BaulId == baulId).ToListAsync();

        var linkedUserIds = personas.Where(su => su.IsClaimed).Select(su => su.UserId!).Distinct().ToList();
        var linkedUserNames = await dbContext.Users.AsNoTracking()
            .Where(u => linkedUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);

        var chapters = await dbContext.Chapters.AsNoTracking().Where(a => a.BaulId == baulId).ToListAsync();

        // Active-only — see GetDashboardCountsAsync's comment.
        var photoCount = await dbContext.Photos.CountAsync(p => p.BaulId == baulId && p.Status == PhotoStatus.Active);

        // Deliberately not Active-only, unlike photoCount above: a soft-deleted photo's file is
        // still in storage (see API-CONVENTIONS.md), so it still counts toward the baúl's actual
        // storage usage.
        var totalSizeBytes = await dbContext.Photos.Where(p => p.BaulId == baulId).SumAsync(p => p.SizeBytes);

        var recuerdoCount = await dbContext.Recuerdos.CountAsync(r => r.BaulId == baulId);

        return new AdminBaulDetailRow(baul, personas, linkedUserNames, chapters, photoCount, recuerdoCount, totalSizeBytes);
    }
}
