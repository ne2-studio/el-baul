using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;

namespace ElBaul.Core.Recuerdos.Application;

/// <summary>
/// Recuerdos' side of Photos.OutputPorts.IPhotoMergeListener: reassign every duplicate's recuerdos
/// onto the survivor, keeping the entities themselves (authorship/timestamps untouched) rather than
/// recreating them.
/// </summary>
public class RecuerdoPhotoMergeListener(IRecuerdoRepository recuerdoRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        foreach (var duplicate in result.Duplicates)
        {
            foreach (var recuerdo in await recuerdoRepository.GetByPhotoIdAsync(duplicate.Id))
                await recuerdoRepository.UpdateAsync(recuerdo.ForPhoto(result.Survivor.Id));
        }
    }
}
