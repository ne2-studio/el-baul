using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.InputPorts.Recuerdos;
// Every recuerdo (comment) read/write operation lives here regardless of scope — baúl-wide,
// chapter-scoped, or on a single photo — rather than being split across IBaulManager/
// IChapterManager/IRecuerdoManager by which aggregate the caller happens to be looking at.
public interface IRecuerdoManager
{
    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(BaulId baulId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(BaulId baulId, string text);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(ChapterId chapterId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(ChapterId chapterId, string text);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(PhotoId photoId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(PhotoId photoId, string text);

    Task<Result<RecuerdoDto>> UpdateRecuerdoAsync(RecuerdoId recuerdoId, string text);
}
