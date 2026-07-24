using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];

    public void SeedForBaul(BaulId baulId, Recuerdo recuerdo) => _recuerdos.Add(recuerdo with { BaulId = baulId });

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId) =>
        Task.FromResult(_recuerdos.Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds)
    {
        var ids = photoIds.ToHashSet();
        return Task.FromResult(_recuerdos.Where(r => r.PhotoId is { } id && ids.Contains(id)).OrderBy(r => r.CreatedAt).AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId) =>
        Task.FromResult(_recuerdos.Where(r => r.ChapterId == chapterId).OrderByDescending(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId) =>
        Task.FromResult(_recuerdos.Where(r => r.BaulId == baulId).OrderByDescending(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since) =>
        Task.FromResult(_recuerdos.Where(r => r.BaulId == baulId && r.CreatedAt >= since).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetAllAsync() => Task.FromResult(_recuerdos.AsEnumerable());

    // Recuerdo.BaulId is a non-nullable BaulId, so this fake uses Guid.Empty as the "missing"
    // sentinel — SeedForBaul is what normally assigns a real BaulId, so a recuerdo added
    // straight via CreateAsync without one stays default(BaulId), mirroring a null BaulId column.
    public Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync() =>
        Task.FromResult(_recuerdos
            .Where(r => r.BaulId.Value == Guid.Empty)
            .Select(r => new RecuerdoBaulIdCandidate(r.Id.Value, r.PhotoId?.Value, r.ChapterId?.Value))
            .AsEnumerable());

    public Task SetBaulIdAsync(RecuerdoId recuerdoId, BaulId baulId)
    {
        var index = _recuerdos.FindIndex(r => r.Id == recuerdoId);
        if (index >= 0) _recuerdos[index] = _recuerdos[index] with { BaulId = baulId };
        return Task.CompletedTask;
    }

    public Task CreateAsync(Recuerdo recuerdo)
    {
        _recuerdos.Add(recuerdo);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Recuerdo recuerdo)
    {
        var index = _recuerdos.FindIndex(r => r.Id == recuerdo.Id);
        if (index >= 0) _recuerdos[index] = recuerdo;
        return Task.CompletedTask;
    }
}
