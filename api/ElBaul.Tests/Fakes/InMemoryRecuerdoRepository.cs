using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryRecuerdoRepository : IRecuerdoRepository
{
    private readonly List<Recuerdo> _recuerdos = [];

    public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId) =>
        Task.FromResult(_recuerdos.Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt).AsEnumerable());

    public Task CreateAsync(Recuerdo recuerdo)
    {
        _recuerdos.Add(recuerdo);
        return Task.CompletedTask;
    }
}
