using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// Computes IPhotoListReadModel's rows over the same in-memory stores IPhotoRepository/
// IRecuerdoRepository already hold — not a separately-seeded fake — so BaulFixture-driven tests
// (and el-baul-api-lite) see this read model reflect whatever a test already seeded through
// those repositories. Row assembly is shared with PhotoListReadModel via PhotoListRowFactory.
public class InMemoryPhotoListReadModel(
    IPhotoRepository photoRepository, IRecuerdoRepository recuerdoRepository, IPhotoPersonaTagRepository photoPersonaTagRepository)
    : IPhotoListReadModel
{
    public async Task<IReadOnlyList<PhotoListRow>> GetByChapterIdAsync(ChapterId chapterId) =>
        await BuildRowsAsync((await photoRepository.GetByChapterIdAsync(chapterId)).ToList());

    public async Task<IReadOnlyList<PhotoListRow>> GetLooseByBaulIdAsync(BaulId baulId) =>
        await BuildRowsAsync((await photoRepository.GetLooseByBaulIdAsync(baulId)).ToList());

    public async Task<IReadOnlyList<PhotoListRow>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
        await BuildRowsAsync((await photoRepository.GetPageAsync(baulId, chapterId, skip, take)).ToList());

    public async Task<IReadOnlyList<PhotoListRow>> GetActiveByIdsAsync(BaulId baulId, IEnumerable<PhotoId> photoIds)
    {
        var photos = (await photoRepository.GetByIdsAsync(photoIds))
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active)
            .OrderByChronology()
            .ToList();
        return await BuildRowsAsync(photos);
    }

    public async Task<PhotoListRow?> GetUntaggedSuggestionAsync(BaulId baulId)
    {
        var untagged = new List<Photo>();
        foreach (var photo in await photoRepository.GetActiveByBaulIdAsync(baulId))
        {
            if (photo.ConfirmedNoPersonas) continue;
            var tags = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photo.Id);
            if (!tags.Any()) untagged.Add(photo);
        }
        if (untagged.Count == 0) return null;

        // Random, not the first untagged photo found — matches PhotoListReadModel's
        // `ORDER BY random()`, so the suggestion varies between visits on both stores.
        var chosen = untagged[Random.Shared.Next(untagged.Count)];
        var rows = await BuildRowsAsync([chosen]);
        return rows.Count > 0 ? rows[0] : null;
    }

    private async Task<IReadOnlyList<PhotoListRow>> BuildRowsAsync(List<Photo> photos)
    {
        if (photos.Count == 0) return [];

        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photos.Select(p => p.Id));
        var recuerdoCounts = recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());

        return photos.Select(p => PhotoListRowFactory.Build(p, recuerdoCounts.GetValueOrDefault(p.Id))).ToList();
    }
}
