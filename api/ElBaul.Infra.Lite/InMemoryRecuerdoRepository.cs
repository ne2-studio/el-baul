using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];
    private readonly Lock _lock = new();

    public void SeedForBaul(BaulId baulId, Recuerdo recuerdo)
    {
        var copy = new Recuerdo(
            recuerdo.Id, recuerdo.PhotoId, recuerdo.ChapterId, baulId, recuerdo.UserId,
            recuerdo.Text, recuerdo.CreatedAt);
        lock (_lock) _recuerdos.Add(copy);
    }

    public Task<Recuerdo?> GetByIdAsync(RecuerdoId recuerdoId)
    {
        lock (_lock) return Task.FromResult(_recuerdos.FirstOrDefault(r => r.Id == recuerdoId));
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

    public Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId)
    {
        lock (_lock)
            return Task.FromResult(_recuerdos
                .Where(r => r.BaulId == baulId && r.CreatedAt >= since && r.UserId != excludingUserId)
                .ToList().AsEnumerable());
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

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) _recuerdos.RemoveAll(r => r.BaulId == baulId);
        return Task.CompletedTask;
    }
}
