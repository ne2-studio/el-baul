using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.OutputPorts;
public interface IRecuerdoRepository
{
    Task<Recuerdo?> GetByIdAsync(RecuerdoId recuerdoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds);
    Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId);

    /// <summary>All recuerdos in a baúl — photo-attached, chapter-attached, and standalone —
    /// newest first.</summary>
    Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Recuerdos created since <paramref name="since"/>, excluding ones authored by
    /// <paramref name="excludingUserId"/> — used by the weekly digest, which has no reason to
    /// tell a user about their own contributions.</summary>
    Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId);

    Task CreateAsync(Recuerdo recuerdo);
    Task UpdateAsync(Recuerdo recuerdo);

    /// <summary>Deletes every recuerdo in the baúl — photo-attached, chapter-attached, and
    /// standalone. Used by the admin hard-delete flow: Recuerdo.BaulId/ChapterId are Restrict
    /// FKs, so these rows must be gone before the Baul (or its Chapters) can be deleted.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);
}
