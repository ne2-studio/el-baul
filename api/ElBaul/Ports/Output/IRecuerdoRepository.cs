namespace ElBaul.Ports.Output;

public interface IRecuerdoRepository
{
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId);
    Task CreateAsync(Recuerdo recuerdo);
}
