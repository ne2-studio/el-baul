using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public interface IPhotoDtoProjector
{
    Task<PhotoDto> ProjectAsync(Photo photo);
    Task<List<PhotoDto>> ProjectAsync(IEnumerable<Photo> photos);
}
