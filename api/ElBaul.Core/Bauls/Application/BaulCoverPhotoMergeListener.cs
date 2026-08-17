using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

namespace ElBaul.Core.Bauls.Application;

/// <summary>
/// Bauls' side of Photos.OutputPorts.IPhotoMergeListener: redirect the baúl's cover onto the
/// survivor's own (bit-identical) blob, never onto the duplicate's storage key — the survivor must
/// never reference a duplicate's blob (see docs/.backlog issue #20 §17).
/// </summary>
public class BaulCoverPhotoMergeListener(IBaulRepository baulRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        var baul = await baulRepository.GetByIdAsync(result.Survivor.BaulId);
        if (baul is not null && result.Duplicates.Any(d => d.Id == baul.CoverPhotoId))
            await baulRepository.UpdateAsync(baul.WithCoverPhotoId(result.Survivor.Id, now));
    }
}
