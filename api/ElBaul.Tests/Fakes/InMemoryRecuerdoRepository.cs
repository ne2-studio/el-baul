using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];

    // The real repository resolves a Recuerdo's baúl by joining through Photo/Album (it has
    // no BaulId of its own) — replicating that join here would mean wiring this fake to the
    // Photo/Album fakes too, so tests instead declare the association directly.
    private readonly Dictionary<Guid, Guid> _baulIdByRecuerdoId = new();

    public void SeedForBaul(Guid baulId, Recuerdo recuerdo)
    {
        _recuerdos.Add(recuerdo);
        _baulIdByRecuerdoId[recuerdo.Id] = baulId;
    }

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId) =>
        Task.FromResult(_recuerdos.Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds)
    {
        var ids = photoIds.ToHashSet();
        return Task.FromResult(_recuerdos.Where(r => r.PhotoId is { } id && ids.Contains(id)).OrderBy(r => r.CreatedAt).AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByAlbumIdAsync(Guid albumId) =>
        Task.FromResult(_recuerdos.Where(r => r.AlbumId == albumId).OrderByDescending(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since) =>
        Task.FromResult(_recuerdos.Where(r =>
            _baulIdByRecuerdoId.GetValueOrDefault(r.Id) == baulId && r.CreatedAt >= since).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync() =>
        Task.FromResult(_recuerdos.Where(r => r.PhotoId != null && r.AlbumId == null).AsEnumerable());

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
