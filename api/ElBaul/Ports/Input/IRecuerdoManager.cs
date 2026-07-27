using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

// Recuerdos (comments) left on a single photo. Baúl-wide recuerdo browsing/creation lives on
// IBaulManager instead — the two aggregate different scopes and, unlike this interface, that
// one also resolves chapter name/photo thumbnail per entry.
public interface IRecuerdoManager
{
    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text);
}
