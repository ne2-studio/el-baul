using ElBaul.OutputPorts.Admin;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.TvMode;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

/// <summary>
/// Hard-deletes a baúl graph in the FK-safe order required by the real schema. The order is
/// infrastructure knowledge: Photo/Recuerdo/PhotoPersonaTag have Restrict FKs to Baul or its
/// children, so those rows must be deleted before the Baul row itself.
/// </summary>
public class AdminBaulDeletionRepository(
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    ISharedLinkRepository sharedLinkRepository,
    IBaulInviteLinkRepository baulInviteLinkRepository,
    ITvSessionRepository tvSessionRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IUnitOfWork unitOfWork) : IAdminBaulDeletionRepository
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
