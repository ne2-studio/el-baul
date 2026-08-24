using ElBaul.Core.Personas.Application;
using ElBaul.Domain;

namespace ElBaul.Core.Notifications.Application;

/// <summary>An activity item worth attributing in a digest — just enough to work out "who did
/// this": which baúl it happened in (a Persona's nickname is baúl-scoped, so attribution always
/// needs to know which baúl to resolve it against), who did it, and when (for the top-contributor
/// tie-break).</summary>
public record DigestAttributionItem(BaulId BaulId, UserId UserId, DateTime CreatedAt);

/// <summary>Either the single contributor behind a group of digest items, or the top contributor
/// plus a flag that others also contributed — never omits a name (see GitHub #54).</summary>
public record DigestAttribution(AuthorInfo TopAuthor, bool HasOtherContributors);

/// <summary>Turns a group of digest activity items into "who did this" for a digest block/line:
/// the single contributor's name if there was only one, or the top contributor (by item count,
/// tie-broken by earliest CreatedAt) plus a marker that others contributed too. Shared by both
/// the weekly digest email (per block, within one baúl) and the daily push digest (once, across
/// every baúl and block kind in the digest) — see DigestActivityPolicy's doc comment on why both
/// channels should share one policy/resolver instead of re-deriving this per channel.</summary>
public class DigestAttributionResolver(AuthorInfoProjector authorInfoProjector)
{
    public async Task<DigestAttribution?> ResolveAsync(IReadOnlyList<DigestAttributionItem> items)
    {
        if (items.Count == 0) return null;

        // One GetManyAsync per distinct baúl in the group (a single baúl for every weekly-email
        // block; potentially several for the cross-baúl push digest line) rather than one lookup
        // per item.
        var authorsByBaul = new Dictionary<BaulId, IReadOnlyDictionary<UserId, AuthorInfo>>();
        foreach (var baulId in items.Select(i => i.BaulId).Distinct())
        {
            var userIds = items.Where(i => i.BaulId == baulId).Select(i => i.UserId).Distinct();
            authorsByBaul[baulId] = await authorInfoProjector.GetManyAsync(baulId, userIds);
        }

        var topContributor = items
            .GroupBy(i => i.UserId)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Min(i => i.CreatedAt))
            .First();

        // The top contributor's name is baúl-scoped, so anchor the lookup on whichever baúl they
        // contributed the most to (tie-broken the same way as the contributor pick itself).
        var anchorBaulId = topContributor
            .GroupBy(i => i.BaulId)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Min(i => i.CreatedAt))
            .First().Key;

        var topAuthor = AuthorInfoProjector.Resolve(authorsByBaul[anchorBaulId], topContributor.Key);
        var hasOtherContributors = items.Select(i => i.UserId).Distinct().Count() > 1;

        return new DigestAttribution(topAuthor, hasOtherContributors);
    }
}
