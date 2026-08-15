using ElBaul.Core.Admin.OutputPorts;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
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
    IBaulInviteLinkRepository baulInviteLinkRepository,
    ITvSessionRepository tvSessionRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IUnitOfWork unitOfWork)
    : IAdminBaulDeletionRepository
{
    public async Task<DeletedBaulStorageObjects?> DeleteBaulGraphAsync(BaulId baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return null;

        var photos = (await photoRepository.GetAllByBaulIdAsync(baulId)).ToList();
        var personas = (await baulRepository.GetPersonasAsync(baulId)).ToList();
        var storageObjects = new DeletedBaulStorageObjects(
            photos.Select(p => p.StorageKey).ToList(),
            personas.Where(p => !string.IsNullOrEmpty(p.AvatarPhotoKey)).Select(p => p.AvatarPhotoKey!).ToList());

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await photoPersonaTagRepository.DeleteByBaulIdAsync(baulId);
            await sharedLinkRepository.DeleteByBaulIdAsync(baulId);
            await baulInviteLinkRepository.DeleteByBaulIdAsync(baulId);
            await tvSessionRepository.DeleteByBaulIdAsync(baulId);
            await recuerdoRepository.DeleteByBaulIdAsync(baulId);
            await photoRepository.DeleteByBaulIdAsync(baulId);
            await chapterRepository.DeleteByBaulIdAsync(baulId);
            await baulRepository.RemoveAllPersonasAsync(baulId);
            await baulRepository.DeleteAllRemovalRequestsAsync(baulId);
            await baulRepository.DeleteAsync(baulId);
            return Result.Success();
        });

        return storageObjects;
    }
}
