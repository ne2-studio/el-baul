namespace ElBaul.Ports.Output;

/// <summary>
/// The backoffice baúl detail screen. SharedUsers doubles as both "miembros" and "personas"
/// from the PRD — they're the same rows (SharedUser.Id is already the PersonId the
/// invitation flow keys off of), so there's no separate query for each.
/// LinkedUserNames maps a SharedUser's UserId to a display name/email, for the SharedUsers
/// that have a linked account — avoids an N+1 user lookup per persona row.
/// </summary>
public record AdminBaulDetailRow(
    Baul Baul,
    IEnumerable<SharedUser> SharedUsers,
    IReadOnlyDictionary<string, string> LinkedUserNames,
    IEnumerable<Chapter> Chapters,
    int PhotoCount,
    int RecuerdoCount
);
