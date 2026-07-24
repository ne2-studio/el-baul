using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IChapterManager
{
    Task<Result<IEnumerable<ChapterDto>>> GetByBaulIdAsync(Guid baulId);
    Task<Result<ChapterDto>> CreateAsync(Guid baulId, string name);
    Task<Result<ChapterDto>> SetCoverAsync(Guid chapterId, Guid photoId);
    Task<Result<ChapterDto>> UpdateAsync(Guid chapterId, string name);
    Task<Result> DeleteAsync(Guid chapterId);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid chapterId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid chapterId, string text);
}
