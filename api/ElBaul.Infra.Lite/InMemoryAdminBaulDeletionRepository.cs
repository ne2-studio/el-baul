using ElBaul.Core.Admin.OutputPorts;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Moderation.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.TvMode.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

public class InMemoryAdminBaulDeletionRepository(
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    ISharedLinkRepository sharedLinkRepository,
    ITvSessionRepository tvSessionRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IRemovalRequestRepository removalRequestRepository,
    IPersonaRepository personaRepository,
    IUnitOfWork unitOfWork)
    : IAdminBaulDeletionRepository
{
    public async Task<DeletedBaulStorageObjects?> DeleteBaulGraphAsync(BaulId baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return null;

        var photos = (await photoRepository.GetAllByBaulIdAsync(baulId)).ToList();
        var storageObjects = new DeletedBaulStorageObjects(photos.Select(p => p.StorageKey).ToList());

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await photoPersonaTagRepository.DeleteByBaulIdAsync(baulId);
            await sharedLinkRepository.DeleteByBaulIdAsync(baulId);
            await tvSessionRepository.DeleteByBaulIdAsync(baulId);
            await recuerdoRepository.DeleteByBaulIdAsync(baulId);
            await photoRepository.DeleteByBaulIdAsync(baulId);
            await chapterRepository.DeleteByBaulIdAsync(baulId);
            await personaRepository.RemoveAllPersonasAsync(baulId);
            await removalRequestRepository.DeleteByBaulIdAsync(baulId);
            await baulRepository.DeleteAsync(baulId);
            return Result.Success();
        });

        return storageObjects;
    }
}
