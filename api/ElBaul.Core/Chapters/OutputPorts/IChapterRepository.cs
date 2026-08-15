using ElBaul.Domain;
namespace ElBaul.Core.Chapters.OutputPorts;
public interface IChapterRepository
{
    Task<Chapter?> GetByIdAsync(ChapterId id);
    Task<IEnumerable<Chapter>> GetByBaulIdAsync(BaulId baulId);
    /// <summary>Chapters created since <paramref name="since"/>, excluding ones created by
    /// <paramref name="excludingUserId"/> — used by the weekly digest, which has no reason to
    /// tell a user about their own contributions.</summary>
    Task<IEnumerable<Chapter>> GetCreatedSinceAsync(BaulId baulId, DateTime since, string excludingUserId);
    Task CreateAsync(Chapter chapter);
    Task UpdateAsync(Chapter chapter);
    Task DeleteAsync(ChapterId id);

    /// <summary>Chapters that still carry a legacy CoverPhotoKey but have never had CoverPhotoId
    /// backfilled — the candidate set backfill-baul-chapter-cover-photo-id resolves. See
    /// Chapter.CoverPhotoKey for why the field still exists at all.</summary>
    Task<IEnumerable<Chapter>> GetWithLegacyCoverPhotoKeyAsync();

    /// <summary>Sets CoverPhotoId directly, bypassing the normal Chapter.WithCoverPhotoId/
    /// UpdateAsync path — used only by the backfill command, which must not bump UpdatedAt for
    /// a purely internal migration of an already-existing cover reference (mirrors
    /// IRecuerdoRepository.SetBaulIdAsync).</summary>
    Task SetCoverPhotoIdAsync(ChapterId id, PhotoId coverPhotoId);

    /// <summary>Used by the admin hard-delete flow. Chapter.BaulId cascades at the DB level,
    /// but the in-memory (Lite) repository has no such enforcement, so callers delete
    /// explicitly rather than relying on cascade behavior that only exists in one backend.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);
}
