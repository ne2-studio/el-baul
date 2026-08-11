using ElBaul.Application.Bauls;
using ElBaul.Domain;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Users;

namespace ElBaul.Application.Notifications;

/// <summary>
/// The single policy for what counts as notable family activity in a digest: contributions made
/// by other members, in baúles the recipient can still access, since the digest cursor.
/// Channels keep their own presentation shape, but should start from this summary.
/// </summary>
public class DigestActivityPolicy(
    BaulAccessService baulAccess,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository)
{
    public async Task<DigestActivitySummary> CollectAsync(User user, DateTime since)
    {
        var baules = (await baulAccess.GetAccessibleAsync(user.Id))
            .Select(access => access.Baul)
            .OrderBy(b => b.Name)
            .ToList();

        var activeBaules = new List<BaulDigestActivity>();
        foreach (var baul in baules)
        {
            var activity = await CollectBaulAsync(baul, since, user.Id);
            if (activity.HasActivity)
                activeBaules.Add(activity);
        }

        return new DigestActivitySummary(baules, activeBaules);
    }

    private async Task<BaulDigestActivity> CollectBaulAsync(Baul baul, DateTime since, UserId excludingUserId)
    {
        var newChapters = (await chapterRepository.GetCreatedSinceAsync(baul.Id, since, excludingUserId)).ToList();
        var recuerdoCount = (await recuerdoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, excludingUserId)).Count();
        var photos = (await photoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, excludingUserId)).ToList();
        var photosByChapter = photos.Where(p => p.ChapterId is not null).GroupBy(p => p.ChapterId!.Value).ToList();

        var chaptersById = photosByChapter.Count == 0
            ? new Dictionary<ChapterId, Chapter>()
            : (await chapterRepository.GetByBaulIdAsync(baul.Id)).ToDictionary(c => c.Id);

        var chapterPhotoActivity = photosByChapter
            .Select(group => chaptersById.TryGetValue(group.Key, out var chapter)
                ? new ChapterPhotoDigestActivity(chapter, group.Count())
                : null)
            .Where(activity => activity is not null)
            .Select(activity => activity!)
            .OrderByDescending(activity => activity.Count)
            .ToList();

        var loosePhotoCount = photos.Count(p => p.ChapterId is null);
        return new BaulDigestActivity(baul, newChapters, recuerdoCount, chapterPhotoActivity, loosePhotoCount);
    }
}

public record DigestActivitySummary(
    IReadOnlyList<Baul> AccessibleBaules,
    IReadOnlyList<BaulDigestActivity> ActiveBaules)
{
    public bool HasBaules => AccessibleBaules.Count > 0;
    public bool HasActivity => ActiveBaules.Count > 0;

    public int TotalChapters => ActiveBaules.Sum(baul => baul.NewChapters.Count);
    public int TotalRecuerdos => ActiveBaules.Sum(baul => baul.NewRecuerdoCount);
    public int TotalPhotos => ActiveBaules.Sum(baul => baul.NewPhotoCount);
}

public record BaulDigestActivity(
    Baul Baul,
    IReadOnlyList<Chapter> NewChapters,
    int NewRecuerdoCount,
    IReadOnlyList<ChapterPhotoDigestActivity> NewPhotosByChapter,
    int NewLoosePhotoCount)
{
    public bool HasActivity => NewChapters.Count + NewRecuerdoCount + NewPhotoCount > 0;
    public int NewPhotoCount => NewPhotosByChapter.Sum(activity => activity.Count) + NewLoosePhotoCount;
}

public record ChapterPhotoDigestActivity(Chapter Chapter, int Count);
