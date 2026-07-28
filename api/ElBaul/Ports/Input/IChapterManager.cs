using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IChapterManager
{
    Task<Result<IEnumerable<ChapterDto>>> GetByBaulIdAsync(BaulId baulId);
    Task<Result<ChapterDto>> CreateAsync(BaulId baulId, string name);
    Task<Result<ChapterDto>> SetCoverAsync(ChapterId chapterId, PhotoId photoId);
    Task<Result<ChapterDto>> UpdateAsync(ChapterId chapterId, string name);
    Task<Result> DeleteAsync(ChapterId chapterId);
}
