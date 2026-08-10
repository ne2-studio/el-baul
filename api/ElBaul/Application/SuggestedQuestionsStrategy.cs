using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Application;

// Own seam so the AI-backed alternative (AiSuggestedQuestionsStrategy) and this default can be
// swapped via Features:ChatSuggestionsStrategy without ChatManager knowing which one is active.
public interface ISuggestedQuestionsStrategy
{
    Task<Result<IEnumerable<string>>> GenerateAsync(Baul baul);
}

// Default strategy: deterministic templates filled in with the baúl's own personas and
// capítulos, no AI call involved — cheap, instant, and never fails. "Nothing fancy" by design;
// see AiSuggestedQuestionsStrategy for the AI-generated alternative.
public class StaticSuggestedQuestionsStrategy(
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository) : ISuggestedQuestionsStrategy
{
    private const int MaxQuestions = 4;
    private const int MaxPerCategory = 2;

    // Used to pad the list when the baúl doesn't have enough personas/capítulos yet to fill
    // MaxQuestions on its own (e.g. a freshly created baúl).
    private static readonly string[] FallbackQuestions =
    [
        "Ayúdame a escribir un recuerdo.",
        "¿Qué sabemos de la historia de esta familia?"
    ];

    public async Task<Result<IEnumerable<string>>> GenerateAsync(Baul baul)
    {
        var chapters = (await chapterRepository.GetByBaulIdAsync(baul.Id)).ToList();
        var personas = (await baulRepository.GetPersonasAsync(baul.Id)).ToList();

        var questions = new List<string>();
        questions.AddRange(personas.Take(MaxPerCategory).Select(p => $"¿Qué recuerdos tenemos sobre {p.Nickname}?"));
        questions.AddRange(chapters.Take(MaxPerCategory).Select(c => $"¿Qué pasó durante {c.Name}?"));

        foreach (var fallback in FallbackQuestions)
        {
            if (questions.Count >= MaxQuestions) break;
            questions.Add(fallback);
        }

        return Result.Success<IEnumerable<string>>(questions.Take(MaxQuestions));
    }
}
