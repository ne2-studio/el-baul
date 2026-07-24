using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];
    private readonly Lock _lock = new();

    public void SeedForBaul(BaulId baulId, Recuerdo recuerdo)
    {
        lock (_lock) _recuerdos.Add(recuerdo with { BaulId = baulId });
    }

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId)
    {
        lock (_lock) return Task.FromResult(_recuerdos.Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds)
    {
        var ids = photoIds.ToHashSet();
        lock (_lock) return Task.FromResult(_recuerdos.Where(r => r.PhotoId is { } id && ids.Contains(id)).OrderBy(r => r.CreatedAt).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId)
    {
        lock (_lock) return Task.FromResult(_recuerdos.Where(r => r.ChapterId == chapterId).OrderByDescending(r => r.CreatedAt).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_recuerdos.Where(r => r.BaulId == baulId).OrderByDescending(r => r.CreatedAt).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since)
    {
        lock (_lock) return Task.FromResult(_recuerdos.Where(r => r.BaulId == baulId && r.CreatedAt >= since).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetAllAsync()
    {
        lock (_lock) return Task.FromResult(_recuerdos.ToList().AsEnumerable());
    }

    // Recuerdo.BaulId is a non-nullable BaulId, so this fake uses Guid.Empty as the "missing"
    // sentinel — SeedForBaul is what normally assigns a real BaulId, so a recuerdo added
    // straight via CreateAsync without one stays default(BaulId), mirroring a null BaulId column.
    public Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync()
    {
        lock (_lock)
        {
            return Task.FromResult(_recuerdos
                .Where(r => r.BaulId.Value == Guid.Empty)
                .Select(r => new RecuerdoBaulIdCandidate(r.Id.Value, r.PhotoId?.Value, r.ChapterId?.Value))
                .ToList()
                .AsEnumerable());
        }
    }

    public Task SetBaulIdAsync(RecuerdoId recuerdoId, BaulId baulId)
    {
        lock (_lock)
        {
            var index = _recuerdos.FindIndex(r => r.Id == recuerdoId);
            if (index >= 0) _recuerdos[index] = _recuerdos[index] with { BaulId = baulId };
        }
        return Task.CompletedTask;
    }

    public Task CreateAsync(Recuerdo recuerdo)
    {
        lock (_lock) _recuerdos.Add(recuerdo);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Recuerdo recuerdo)
    {
        lock (_lock)
        {
            var index = _recuerdos.FindIndex(r => r.Id == recuerdo.Id);
            if (index >= 0) _recuerdos[index] = recuerdo;
        }
        return Task.CompletedTask;
    }
}
