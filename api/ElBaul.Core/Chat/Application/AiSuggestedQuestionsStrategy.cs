using System.Text.RegularExpressions;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

namespace ElBaul.Core.Chat.Application;
// Alternative to StaticSuggestedQuestionsStrategy, selected via Features:ChatSuggestionsStrategy
// = "Ai" (see ElBaulApiHost's registration). Costs a real AI call every time the chat opens with
// no history, and can fail (unlike the static default), so it's opt-in rather than the default.
public class AiSuggestedQuestionsStrategy(
    ILogger<AiSuggestedQuestionsStrategy> logger,
    IChatContextBuilder chatContextBuilder,
    IAiChatBackend aiChatBackend) : ISuggestedQuestionsStrategy
{
    // Shown before the user has asked anything, so there's no query to build a real (recuerdo-
    // ranked) ChatContextBuilder.BuildAsync context from — BuildSummaryAsync's baúl/personas/
    // capítulos header is enough to suggest questions grounded in this specific baúl.
    private const string Instruction =
        "Eres un asistente que ayuda a una familia a explorar la historia guardada en su baúl familiar digital. " +
        "A partir de la información del baúl que se te proporciona a continuación (sus personas y sus capítulos), " +
        "genera exactamente 4 preguntas cortas y variadas, en español, que alguien de la familia podría hacerte " +
        "para empezar a explorar sus recuerdos. Cuando tenga sentido, menciona nombres reales de personas o " +
        "capítulos del baúl. Devuelve únicamente las 4 preguntas, una por línea, sin numeración, sin viñetas y " +
        "sin ningún otro texto.";

    private static readonly Regex ListMarker = new(@"^[\s\-\*•\d\.\)]+", RegexOptions.Compiled);

    public async Task<Result<IEnumerable<string>>> GenerateAsync(Baul baul)
    {
        var prompt = Instruction + "\n\n" + await chatContextBuilder.BuildSummaryAsync(baul);
        var replyResult = await aiChatBackend.GetReplyAsync(prompt, []);
        if (replyResult.IsFailure)
        {
            logger.LogError("Suggested questions failed {Error}", replyResult.Error);
            return Result.Failure<IEnumerable<string>>(replyResult.Error);
        }

        return Result.Success(ParseQuestions(replyResult.Value));
    }

    private static IEnumerable<string> ParseQuestions(string reply) =>
        reply.Split('\n')
            .Select(line => ListMarker.Replace(line, "").Trim())
            .Where(line => line.Length > 0);
}
