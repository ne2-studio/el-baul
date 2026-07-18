using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId) =>
        Task.FromResult(_recuerdos.Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt).AsEnumerable());

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds)
    {
        var ids = photoIds.ToHashSet();
        return Task.FromResult(_recuerdos.Where(r => r.PhotoId is { } id && ids.Contains(id)).OrderBy(r => r.CreatedAt).AsEnumerable());
    }

    public Task<IEnumerable<Recuerdo>> GetByAlbumIdAsync(Guid albumId) =>
        Task.FromResult(_recuerdos.Where(r => r.AlbumId == albumId).OrderByDescending(r => r.CreatedAt).AsEnumerable());

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
