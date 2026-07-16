namespace ElBaul.Ports.Output;

public interface IRecuerdoRepository
{
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds);
    Task CreateAsync(Recuerdo recuerdo);
}
